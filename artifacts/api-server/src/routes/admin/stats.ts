import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, count, sum, and, gt } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";

const router: IRouter = Router();

router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [totalUsersRow] = await db.select({ count: count() }).from(usersTable);
  const [activeUsersRow] = await db.select({ count: count() }).from(usersTable).where(gt(usersTable.investmentBalance, "0"));

  const [totalInvestRow] = await db
    .select({ total: sum(usersTable.investmentBalance) })
    .from(usersTable);

  const [totalDepositsRow] = await db
    .select({ total: sum(transactionsTable.amount) })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.type, "deposit"), eq(transactionsTable.status, "approved")));

  const [totalWithdrawalsRow] = await db
    .select({ total: sum(transactionsTable.netAmount) })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.type, "withdrawal"), eq(transactionsTable.status, "approved")));

  const [totalGainsRow] = await db
    .select({ total: sum(transactionsTable.amount) })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.type, "gain"), eq(transactionsTable.status, "approved")));

  const [pendingWithdrawalsRow] = await db
    .select({ count: count() })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.type, "withdrawal"), eq(transactionsTable.status, "pending")));

  const [pendingDepositsRow] = await db
    .select({ count: count() })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.type, "deposit"), eq(transactionsTable.status, "pending")));

  const [pendingDepositsAmountRow] = await db
    .select({ total: sum(transactionsTable.amount) })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.type, "deposit"), eq(transactionsTable.status, "pending")));

  const [pendingWithdrawalsAmountRow] = await db
    .select({ total: sum(transactionsTable.amount) })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.type, "withdrawal"), eq(transactionsTable.status, "pending")));

  const [totalFeeRow] = await db
    .select({ total: sum(transactionsTable.fee) })
    .from(transactionsTable)
    .where(eq(transactionsTable.status, "approved"));

  res.json({
    totalUsers: totalUsersRow?.count ?? 0,
    activeUsers: activeUsersRow?.count ?? 0,
    totalInvestmentCapital: parseFloat(totalInvestRow?.total ?? "0"),
    totalDeposits: parseFloat(totalDepositsRow?.total ?? "0"),
    totalWithdrawals: parseFloat(totalWithdrawalsRow?.total ?? "0"),
    totalGainsDistributed: parseFloat(totalGainsRow?.total ?? "0"),
    pendingWithdrawalsCount: pendingWithdrawalsRow?.count ?? 0,
    pendingDepositsCount: pendingDepositsRow?.count ?? 0,
    pendingDepositsAmount: parseFloat(pendingDepositsAmountRow?.total ?? "0"),
    pendingWithdrawalsAmount: parseFloat(pendingWithdrawalsAmountRow?.total ?? "0"),
    totalFeeRevenue: parseFloat(totalFeeRow?.total ?? "0"),
  });
});

export default router;
