import { Router, type IRouter } from "express";
import { db, transactionsTable } from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

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
    depositMethod: t.depositMethod ?? null,
    payerCountry: t.payerCountry ?? null,
    payerPhone: t.payerPhone ?? null,
    sendavapayRef: t.sendavapayRef ?? null,
    txid: t.txid ?? null,
    screenshotPath: t.screenshotPath ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

router.get("/transactions", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { type, limit = "50", offset = "0" } = req.query as Record<string, string>;

  const limitNum = Math.min(parseInt(limit, 10) || 50, 200);
  const offsetNum = parseInt(offset, 10) || 0;

  const validTypes = ["deposit", "withdrawal", "commission", "gain"] as const;
  type TxType = typeof validTypes[number];

  const conditions = [eq(transactionsTable.userId, userId)];
  if (type && validTypes.includes(type as TxType)) {
    conditions.push(eq(transactionsTable.type, type as TxType));
  }

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  const [totalResult] = await db
    .select({ count: count() })
    .from(transactionsTable)
    .where(whereClause);

  const items = await db
    .select()
    .from(transactionsTable)
    .where(whereClause)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limitNum)
    .offset(offsetNum);

  res.json({
    items: items.map(formatTx),
    total: totalResult?.count ?? 0,
  });
});

export default router;
