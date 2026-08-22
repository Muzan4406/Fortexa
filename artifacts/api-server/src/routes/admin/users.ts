import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, like, count, sum, or, desc, and } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";

const router: IRouter = Router();

function formatUserSummary(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email,
    country: u.country,
    investmentBalance: parseFloat(u.investmentBalance),
    gainBalance: parseFloat(u.gainBalance),
    status: u.status,
    role: u.role,
    referralCode: u.referralCode,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const { search, status, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const limitNum = Math.min(parseInt(limit, 10) || 50, 200);
  const offsetNum = parseInt(offset, 10) || 0;

  const conditions: any[] = [];
  if (search) {
    conditions.push(or(
      like(usersTable.name, `%${search}%`),
      like(usersTable.email, `%${search}%`),
      like(usersTable.phone, `%${search}%`),
    ));
  }
  if (status && ["active", "suspended", "banned"].includes(status)) {
    conditions.push(eq(usersTable.status, status as any));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(whereClause);

  const users = await db
    .select()
    .from(usersTable)
    .where(whereClause)
    .orderBy(desc(usersTable.createdAt))
    .limit(limitNum)
    .offset(offsetNum);

  const items = await Promise.all(users.map(async (user) => {
    const [teamRow] = await db
      .select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.referredById, user.id));
    return { ...formatUserSummary(user), directTeamCount: teamRow?.count ?? 0 };
  }));

  res.json({
    items,
    total: totalRow?.count ?? 0,
  });
});

router.get("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }

  const [depositsRow] = await db
    .select({ total: sum(transactionsTable.amount) })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, id), eq(transactionsTable.type, "deposit"), eq(transactionsTable.status, "approved")));

  const [withdrawalsRow] = await db
    .select({ total: sum(transactionsTable.netAmount) })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, id), eq(transactionsTable.type, "withdrawal"), eq(transactionsTable.status, "approved")));

  const [commissionsRow] = await db
    .select({ total: sum(transactionsTable.amount) })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, id), eq(transactionsTable.type, "commission"), eq(transactionsTable.status, "approved")));

  const team = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      country: usersTable.country,
      status: usersTable.status,
    })
    .from(usersTable)
    .where(eq(usersTable.referredById, id))
    .orderBy(desc(usersTable.createdAt));

  res.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    country: user.country,
    investmentBalance: parseFloat(user.investmentBalance),
    gainBalance: parseFloat(user.gainBalance),
    status: user.status,
    role: user.role,
    referralCode: user.referralCode,
    referredById: user.referredById || null,
    totalDeposited: parseFloat(depositsRow?.total ?? "0"),
    totalWithdrawn: parseFloat(withdrawalsRow?.total ?? "0"),
    referralEarnings: parseFloat(commissionsRow?.total ?? "0"),
    team,
    createdAt: user.createdAt.toISOString(),
  });
});

router.put("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }

  const { name, phone, email, role } = req.body;
  const updates: any = {};
  if (name) updates.name = name;
  if (phone) updates.phone = phone;
  if (email) updates.email = email;
  if (role && ["user", "admin"].includes(role)) updates.role = role;

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }

  res.json({ id: user.id, name: user.name, phone: user.phone, email: user.email,
    investmentBalance: parseFloat(user.investmentBalance), gainBalance: parseFloat(user.gainBalance),
    country: user.country, status: user.status, role: user.role, referralCode: user.referralCode,
    referredById: user.referredById || null, totalDeposited: 0, totalWithdrawn: 0,
    referralEarnings: 0, createdAt: user.createdAt.toISOString() });
});

router.post("/admin/users/:id/suspend", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.update(usersTable).set({ status: "suspended" }).where(eq(usersTable.id, id));
  res.json({ success: true, message: "Compte suspendu" });
});

router.post("/admin/users/:id/ban", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.update(usersTable).set({ status: "banned" }).where(eq(usersTable.id, id));
  res.json({ success: true, message: "Compte banni" });
});

router.post("/admin/users/:id/reactivate", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.update(usersTable).set({ status: "active" }).where(eq(usersTable.id, id));
  res.json({ success: true, message: "Compte réactivé" });
});

router.post("/admin/users/:id/funds", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { type, walletType, amount, reason } = req.body;

  if (!["add", "subtract"].includes(type)) { res.status(400).json({ error: "Type invalide" }); return; }
  if (!["investment", "gains"].includes(walletType)) { res.status(400).json({ error: "Type de portefeuille invalide" }); return; }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) { res.status(400).json({ error: "Montant invalide" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }

  const field = walletType === "investment" ? "investmentBalance" : "gainBalance";
  const current = parseFloat(walletType === "investment" ? user.investmentBalance : user.gainBalance);
  const newBalance = type === "add" ? current + numAmount : Math.max(0, current - numAmount);

  await db.update(usersTable).set({ [field]: newBalance.toFixed(8) }).where(eq(usersTable.id, id));
  res.json({ success: true, message: "Fonds ajustés" });
});

export default router;
