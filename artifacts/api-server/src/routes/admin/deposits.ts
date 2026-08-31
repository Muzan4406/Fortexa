import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, and, desc, count, ilike, inArray, or, sql } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { creditReferralCommissions } from "../../lib/referral";
import { formatTelegramAmount, sendTelegramNotification } from "../../lib/telegram";

const router: IRouter = Router();

const AUTO_PAYMENT_PENDING_DESCRIPTION =
  "Dépôt Mobile Money — initiation automatique, confirmation utilisateur en attente";
const AUTO_PAYMENT_REVIEW_DESCRIPTION =
  "Dépôt Mobile Money — échec fournisseur, vérification manuelle requise";

function formatAdminTx(tx: typeof transactionsTable.$inferSelect, user?: typeof usersTable.$inferSelect | null) {
  const automaticPayment = tx.depositMethod === "mobile_money" && Boolean(tx.sendavapayRef);
  const requiresManualReview =
    automaticPayment &&
    tx.status === "pending" &&
    [AUTO_PAYMENT_PENDING_DESCRIPTION, AUTO_PAYMENT_REVIEW_DESCRIPTION].includes(tx.description ?? "");

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
    automaticPayment,
    requiresManualReview,
    paymentReviewStatus: requiresManualReview
      ? tx.description === AUTO_PAYMENT_REVIEW_DESCRIPTION
        ? "provider_failed_needs_review"
        : "awaiting_user_confirmation"
      : automaticPayment
        ? "confirmation_sent"
        : null,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

router.get("/admin/deposits", requireAdmin, async (req, res): Promise<void> => {
  const { status, search, automaticOnly, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const limitNum = Math.min(parseInt(limit, 10) || 50, 200);
  const offsetNum = parseInt(offset, 10) || 0;

  const conditions: any[] = [eq(transactionsTable.type, "deposit")];
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    conditions.push(eq(transactionsTable.status, status as any));
  }
  if (automaticOnly === "true") {
    conditions.push(
      eq(transactionsTable.status, "pending"),
      eq(transactionsTable.depositMethod, "mobile_money"),
      inArray(transactionsTable.description, [
        AUTO_PAYMENT_PENDING_DESCRIPTION,
        AUTO_PAYMENT_REVIEW_DESCRIPTION,
      ]),
    );
  }
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(or(
      ilike(usersTable.name, term),
      ilike(usersTable.email, term),
      ilike(usersTable.phone, term),
      ilike(transactionsTable.txid, term),
      ilike(transactionsTable.sendavapayRef, term),
      sql`${transactionsTable.id}::text ILIKE ${term}`,
    ));
  }

  const whereClause = and(...conditions);

  const [totalRow] = await db.select({ count: count() }).from(transactionsTable)
    .leftJoin(usersTable, eq(usersTable.id, transactionsTable.userId)).where(whereClause);
  const txs = await db.select({ tx: transactionsTable, user: usersTable }).from(transactionsTable)
    .leftJoin(usersTable, eq(usersTable.id, transactionsTable.userId)).where(whereClause)
    .orderBy(desc(transactionsTable.createdAt)).limit(limitNum).offset(offsetNum);

  const items = txs.map(({ tx, user }) => formatAdminTx(tx, user));

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
  if (!["approved", "rejected", "pending"].includes(status)) {
    res.status(400).json({ error: "Statut de dépôt invalide" });
    return;
  }

  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
  if (!tx || tx.type !== "deposit") { res.status(404).json({ error: "Dépôt non trouvé" }); return; }

  const updates: any = { status };
  if (rejectionReason) updates.rejectionReason = rejectionReason;
  const effectiveAmount = amount ? parseFloat(amount) : parseFloat(tx.amount);
  if (amount) {
    updates.amount = effectiveAmount.toFixed(8);
    updates.netAmount = effectiveAmount.toFixed(8);
  }

  const [updated] = await db.update(transactionsTable).set(updates)
    .where(and(eq(transactionsTable.id, id), eq(transactionsTable.status, "pending"))).returning();
  if (!updated) {
    res.status(409).json({ error: "Ce dépôt a déjà été traité" });
    return;
  }

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

  if (status === "approved" || status === "rejected") {
    void sendTelegramNotification(
      `${status === "approved" ? "✅" : "❌"} Dépôt ${status === "approved" ? "approuvé" : "rejeté"} par l’administrateur\nTransaction #${tx.id}\nUtilisateur #${tx.userId}\nMontant : ${formatTelegramAmount(effectiveAmount)}${status === "rejected" && rejectionReason ? `\nMotif : ${rejectionReason}` : ""}`,
    );
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
  res.json(formatAdminTx(updated, user));
});

export default router;
