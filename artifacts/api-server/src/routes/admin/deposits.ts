import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { creditReferralCommissions } from "../../lib/referral";

const router: IRouter = Router();

function formatAdminTx(tx: typeof transactionsTable.$inferSelect, user?: typeof usersTable.$inferSelect | null) {
  return {
    id: tx.id,
    userId: tx.userId,
    userName: user?.name ?? "Inconnu",
    userEmail: user?.email ?? "",
     userCountry: user?.country ?? null,
    type: tx.type,
    amount: parseFloat(tx.amount),
    fee: parseFloat(tx.fee),
    netAmount: parseFloat(tx.netAmount),
    status: tx.status,
    description: tx.description ?? null,
    rejectionReason: tx.rejectionReason ?? null,
    depositMethod: tx.depositMethod ?? null,
    payerCountry: tx.payerCountry ?? null,
    payerPhone: tx.payerPhone ?? null,
     sendavapayRef: tx.sendavapayRef ?? null,
    txid: tx.txid ?? null,
    screenshotPath: tx.screenshotPath ?? null,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

router.get("/admin/deposits", requireAdmin, async (req, res): Promise<void> => {
  const { status, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const limitNum = Math.min(parseInt(limit, 10) || 50, 200);
  const offsetNum = parseInt(offset, 10) || 0;

  const conditions: any[] = [eq(transactionsTable.type, "deposit")];
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    conditions.push(eq(transactionsTable.status, status as any));
  }

  const whereClause = and(...conditions);

  const [totalRow] = await db.select({ count: count() }).from(transactionsTable).where(whereClause);
  const txs = await db.select().from(transactionsTable).where(whereClause)
    .orderBy(desc(transactionsTable.createdAt)).limit(limitNum).offset(offsetNum);

  const items = await Promise.all(txs.map(async (tx) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
    return formatAdminTx(tx, user);
  }));

  res.json({ items, total: totalRow?.count ?? 0 });
});

router.post("/admin/deposits", requireAdmin, async (req, res): Promise<void> => {
  const { userId, amount, description } = req.body;
  const numAmount = parseFloat(amount);
  if (!userId || isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: "Données invalides" }); return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(userId, 10)));
  if (!user) { res.status(404).json({ error: "Utilisateur non trouvé" }); return; }

  const [tx] = await db.insert(transactionsTable).values({
    userId: parseInt(userId, 10),
    type: "deposit",
    amount: numAmount.toFixed(8),
    fee: "0",
    netAmount: numAmount.toFixed(8),
    status: "approved",
    description: description ?? "Dépôt manuel par administrateur",
  }).returning();

  // Apply to investment balance
  const newInvestment = parseFloat(user.investmentBalance) + numAmount;
  await db.update(usersTable).set({
    investmentBalance: newInvestment.toFixed(8),
    lastGainUpdate: new Date(),
  }).where(eq(usersTable.id, parseInt(userId, 10)));

  // Credit referral commissions
  await creditReferralCommissions(numAmount, parseInt(userId, 10), tx.id);

  res.status(201).json(formatAdminTx(tx, user));
});

router.put("/admin/deposits/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const { status, amount, rejectionReason } = req.body;

  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
  if (!tx || tx.type !== "deposit") { res.status(404).json({ error: "Dépôt non trouvé" }); return; }

  const updates: any = { status };
  if (rejectionReason) updates.rejectionReason = rejectionReason;
  const effectiveAmount = amount ? parseFloat(amount) : parseFloat(tx.amount);
  if (amount) {
    updates.amount = effectiveAmount.toFixed(8);
    updates.netAmount = effectiveAmount.toFixed(8);
  }

  const [updated] = await db.update(transactionsTable).set(updates).where(eq(transactionsTable.id, id)).returning();

  if (status === "approved" && tx.status !== "approved") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
    if (user) {
      const newBalance = parseFloat(user.investmentBalance) + effectiveAmount;
       await db.update(usersTable).set({
         investmentBalance: newBalance.toFixed(8),
         lastGainUpdate: new Date(),
       }).where(eq(usersTable.id, tx.userId));
      await creditReferralCommissions(effectiveAmount, tx.userId, tx.id);
    }
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
  res.json(formatAdminTx(updated, user));
});

export default router;
