import { Router, type IRouter } from "express";
import { db, usersTable, referralCommissionsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/referrals", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }

  // Level 1 referrals (directly referred by this user)
  const level1Users = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.referredById, userId));

  const level1Ids = level1Users.map(u => u.id);

  // Level 2 referrals
  let level2Count = 0;
  let level2Ids: number[] = [];
  if (level1Ids.length > 0) {
    for (const l1Id of level1Ids) {
      const l2Users = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.referredById, l1Id));
      level2Count += l2Users.length;
      level2Ids = level2Ids.concat(l2Users.map(u => u.id));
    }
  }

  // Level 3 referrals
  let level3Count = 0;
  for (const l2Id of level2Ids) {
    const l3Users = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.referredById, l2Id));
    level3Count += l3Users.length;
  }

  // Commission history
  const commissions = await db
    .select({
      id: referralCommissionsTable.id,
      amount: referralCommissionsTable.amount,
      level: referralCommissionsTable.level,
      refereeId: referralCommissionsTable.refereeId,
      createdAt: referralCommissionsTable.createdAt,
    })
    .from(referralCommissionsTable)
    .where(eq(referralCommissionsTable.referrerId, userId))
    .orderBy(referralCommissionsTable.createdAt);

  // Get referee names
  const commissionRecords = await Promise.all(
    commissions.map(async (c) => {
      const [referee] = await db
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, c.refereeId));
      return {
        id: c.id,
        amount: parseFloat(c.amount),
        level: c.level,
        refereeId: c.refereeId,
        refereeName: referee?.name ?? "Utilisateur",
        createdAt: c.createdAt.toISOString(),
      };
    })
  );

  const totalCommissions = commissionRecords.reduce((sum, c) => sum + c.amount, 0);
  const configuredUrl = process.env.APP_URL?.trim().replace(/\/+$/, "");
  const forwardedProto = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim();
  const baseUrl = configuredUrl || `${forwardedProto || req.protocol}://${req.get("host")}`;

  res.json({
    referralCode: user.referralCode,
    referralLink: `${baseUrl}/register?ref=${user.referralCode}`,
    totalCommissions,
    level1Count: level1Users.length,
    level2Count,
    level3Count,
    commissions: commissionRecords,
  });
});

export default router;
