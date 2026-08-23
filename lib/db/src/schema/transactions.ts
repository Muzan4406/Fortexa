import { pgTable, serial, integer, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionTypeEnum = pgEnum("transaction_type", ["deposit", "withdrawal", "commission", "gain"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "approved", "rejected"]);
export const depositMethodEnum = pgEnum("deposit_method", ["mobile_money", "usdt"]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: transactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  fee: numeric("fee", { precision: 20, scale: 8 }).notNull().default("0"),
  netAmount: numeric("net_amount", { precision: 20, scale: 8 }).notNull(),
  status: transactionStatusEnum("status").notNull().default("pending"),
  description: text("description"),
  rejectionReason: text("rejection_reason"),
  // Mobile Money / USDT deposit metadata
  depositMethod: depositMethodEnum("deposit_method"),
  payerCountry: text("payer_country"),
  payerPhone: text("payer_phone"),
  sendavapayRef: text("sendavapay_ref"),
  sendavapayPaymentToken: text("sendavapay_payment_token"),
  ashtechTransactionId: text("ashtech_transaction_id"),
  txid: text("txid"),
  screenshotPath: text("screenshot_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
