import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable, referralCommissionsTable } from "@workspace/db";
import { eq, and, sum } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getSettings, formatSettings } from "../lib/settings";
import { updateGainBalance } from "../lib/gains";

const router: IRouter = Router();

router.get("/dashboard", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;

  // Update gains first
  await updateGainBalance(userId);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }

  // Calculate totals from transactions
  const depositRows = await db
    .select({ total: sum(transactionsTable.netAmount) })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.type, "deposit"), eq(transactionsTable.status, "approved")));

  const withdrawalRows = await db
    .select({ total: sum(transactionsTable.netAmount) })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.type, "withdrawal"), eq(transactionsTable.status, "approved")));

  const commissionRows = await db
    .select({ total: sum(transactionsTable.amount) })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.type, "commission"), eq(transactionsTable.status, "approved")));

  const pendingRows = await db
    .select({ total: sum(transactionsTable.amount) })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.type, "withdrawal"), eq(transactionsTable.status, "pending")));

  const settings = await getSettings();

  res.json({
    investmentBalance: parseFloat(user.investmentBalance),
    gainBalance: parseFloat(user.gainBalance),
    totalDeposited: parseFloat(depositRows[0]?.total ?? "0"),
    totalWithdrawn: parseFloat(withdrawalRows[0]?.total ?? "0"),
    referralEarnings: parseFloat(commissionRows[0]?.total ?? "0"),
    pendingWithdrawals: parseFloat(pendingRows[0]?.total ?? "0"),
    settings: formatSettings(settings),
  });
});

router.get("/gains/snapshot", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;

  // Update the stored gain balance first
  await updateGainBalance(userId);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }

  const settings = await getSettings();

  res.json({
    gainBalance: parseFloat(user.gainBalance),
    investmentBalance: parseFloat(user.investmentBalance),
    dailyRatePercent: parseFloat(settings.dailyRatePercent),
    snapshotTime: new Date().toISOString(),
    gainsActive: settings.gainsActive,
  });
});

export default router;
