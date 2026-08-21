import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getSettings } from "../lib/settings";
import { updateGainBalance } from "../lib/gains";

const router: IRouter = Router();

function formatTx(t: typeof transactionsTable.$inferSelect) {
  return {
    id: t.id,
    userId: t.userId,
    type: t.type,
    amount: parseFloat(t.amount),
    fee: parseFloat(t.fee),
    netAmount: parseFloat(t.netAmount),
    status: t.status,
    description: t.description ?? null,
    rejectionReason: t.rejectionReason ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

router.get("/withdrawals", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const txs = await db
    .select()
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.type, "withdrawal")))
    .orderBy(desc(transactionsTable.createdAt));
  res.json(txs.map(formatTx));
});

router.post("/withdrawals", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { amount, usdtAddress, phone } = req.body;

  const numAmount = parseFloat(amount);
  if (!numAmount || isNaN(numAmount)) {
    res.status(400).json({ error: "Montant invalide" });
    return;
  }

  const settings = await getSettings();
  const minWithdrawal = parseFloat(settings.minWithdrawal);
  const feeRate = parseFloat(settings.withdrawalFeePercent) / 100;

  if (numAmount < minWithdrawal) {
    res.status(400).json({ error: `Le montant minimum de retrait est ${minWithdrawal} FCFA` });
    return;
  }

  // Update gains and read current balance
  await updateGainBalance(userId);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }

  const gainBalance = parseFloat(user.gainBalance);
  if (numAmount > gainBalance) {
    res.status(400).json({ error: "Solde de gains insuffisant" });
    return;
  }

  const fee = numAmount * feeRate;
  const netAmount = numAmount - fee;

  // Deduct from gain balance immediately (hold funds)
  const newGainBalance = gainBalance - numAmount;
  await db
    .update(usersTable)
    .set({ gainBalance: newGainBalance.toFixed(8) })
    .where(eq(usersTable.id, userId));

  const [tx] = await db.insert(transactionsTable).values({
    userId,
    type: "withdrawal",
    amount: numAmount.toFixed(8),
    fee: fee.toFixed(8),
    netAmount: netAmount.toFixed(8),
    status: "pending",
    description: phone
        ? `Retrait Mobile Money → ${phone}`
        : usdtAddress
          ? `Retrait → USDT BEP20 : ${usdtAddress}`
          : "Demande de retrait",
  }).returning();

  res.status(201).json(formatTx(tx));
});

export default router;
