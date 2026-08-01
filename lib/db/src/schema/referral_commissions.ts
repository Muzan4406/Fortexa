import { pgTable, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const referralCommissionsTable = pgTable("referral_commissions", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),   // User who gets the commission
  refereeId: integer("referee_id").notNull(),       // User whose deposit triggered it
  transactionId: integer("transaction_id").notNull(),
  level: integer("level").notNull(),                // 1, 2, or 3
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReferralCommissionSchema = createInsertSchema(referralCommissionsTable).omit({ id: true, createdAt: true });
export type InsertReferralCommission = z.infer<typeof insertReferralCommissionSchema>;
export type ReferralCommission = typeof referralCommissionsTable.$inferSelect;
