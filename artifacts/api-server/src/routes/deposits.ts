import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getSettings } from "../lib/settings";

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

router.get("/deposits", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const txs = await db
    .select()
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.type, "deposit")))
    .orderBy(desc(transactionsTable.createdAt));

  res.json(txs.map(formatTx));
});

router.post("/deposits", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { amount } = req.body;

  const numAmount = parseFloat(amount);
  if (!numAmount || isNaN(numAmount)) {
    res.status(400).json({ error: "Montant invalide" });
    return;
  }

  const settings = await getSettings();
  const minDeposit = parseFloat(settings.minDeposit);
  const maxCapital = parseFloat(settings.maxCapital);

  if (numAmount < minDeposit) {
    res.status(400).json({ error: `Le montant minimum est ${minDeposit} FCFA` });
    return;
  }

  // Check capital limit
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }

  const currentCapital = parseFloat(user.investmentBalance);
  if (currentCapital + numAmount > maxCapital) {
    res.status(400).json({ error: `Capital maximum de ${maxCapital} FCFA atteint` });
    return;
  }

  const [tx] = await db.insert(transactionsTable).values({
    userId,
    type: "deposit",
    amount: numAmount.toFixed(8),
    fee: "0",
    netAmount: numAmount.toFixed(8),
    status: "pending",
    description: "Demande de dépôt",
  }).returning();

  res.status(201).json(formatTx(tx));
});

export { formatTx };
export default router;
