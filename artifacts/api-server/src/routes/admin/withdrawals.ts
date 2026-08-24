import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { formatTelegramAmount, sendTelegramNotification } from "../../lib/telegram";
import { sendPushToUsers } from "../../lib/push";

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
     payerCountry: tx.payerCountry ?? user?.country ?? null,
     payerPhone: tx.payerPhone ?? null,
     sendavapayRef: tx.sendavapayRef ?? null,
     txid: tx.txid ?? null,
     screenshotPath: tx.screenshotPath ?? null,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

router.get("/admin/withdrawals", requireAdmin, async (req, res): Promise<void> => {
  const { status, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const limitNum = Math.min(parseInt(limit, 10) || 50, 200);
  const offsetNum = parseInt(offset, 10) || 0;

  const conditions: any[] = [eq(transactionsTable.type, "withdrawal")];
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

router.put("/admin/withdrawals/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const { status, rejectionReason } = req.body;
  if (!["approved", "rejected", "pending"].includes(status)) {
    res.status(400).json({ error: "Statut de retrait invalide" });
    return;
  }

  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
  if (!tx || tx.type !== "withdrawal") { res.status(404).json({ error: "Retrait non trouvé" }); return; }

  const updates: any = { status };
  if (rejectionReason) updates.rejectionReason = rejectionReason;

  const [updated] = await db.update(transactionsTable).set(updates)
    .where(and(eq(transactionsTable.id, id), eq(transactionsTable.status, "pending"))).returning();
  if (!updated) {
    res.status(409).json({ error: "Ce retrait a déjà été traité" });
    return;
  }

  // If rejected, refund the amount back to gain balance
  if (status === "rejected" && tx.status === "pending") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
    if (user) {
      const refundAmount = parseFloat(tx.amount);
      const newBalance = parseFloat(user.gainBalance) + refundAmount;
      await db.update(usersTable).set({ gainBalance: newBalance.toFixed(8) }).where(eq(usersTable.id, tx.userId));
    }
  }

  if (status === "approved" || status === "rejected") {
    void sendTelegramNotification(
      `${status === "approved" ? "✅" : "❌"} Retrait ${status === "approved" ? "approuvé" : "rejeté"}\nTransaction #${tx.id}\nUtilisateur #${tx.userId}\nMontant : ${formatTelegramAmount(tx.amount)}${status === "rejected" && rejectionReason ? `\nMotif : ${rejectionReason}` : ""}`,
    );
  }
  void sendPushToUsers([tx.userId], {
    title: status === "approved" ? "Retrait approuvé" : "Retrait rejeté",
    body: status === "approved"
      ? `Votre retrait de ${formatTelegramAmount(tx.amount)} a été approuvé.`
      : `Votre retrait de ${formatTelegramAmount(tx.amount)} a été rejeté${rejectionReason ? ` : ${rejectionReason}` : "."}`,
    url: "/transactions",
    tag: `withdrawal-status-${tx.id}`,
  });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
  res.json(formatAdminTx(updated, user));
});

export default router;
