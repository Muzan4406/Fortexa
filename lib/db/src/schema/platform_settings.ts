import { pgTable, serial, numeric, boolean, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Singleton table — always has exactly one row (id=1)
export const platformSettingsTable = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  dailyRatePercent: numeric("daily_rate_percent", { precision: 10, scale: 4 }).notNull().default("3"),
  maxCapital: numeric("max_capital", { precision: 20, scale: 2 }).notNull().default("200000"),
  minDeposit: numeric("min_deposit", { precision: 20, scale: 2 }).notNull().default("3000"),
  minWithdrawal: numeric("min_withdrawal", { precision: 20, scale: 2 }).notNull().default("3000"),
  withdrawalFeePercent: numeric("withdrawal_fee_percent", { precision: 10, scale: 4 }).notNull().default("5"),
  gainsActive: boolean("gains_active").notNull().default(true),
  level1Percent: numeric("level1_percent", { precision: 10, scale: 4 }).notNull().default("5"),
  level2Percent: numeric("level2_percent", { precision: 10, scale: 4 }).notNull().default("2"),
  level3Percent: numeric("level3_percent", { precision: 10, scale: 4 }).notNull().default("1"),
  // Payment integration keys — stored in DB so admin can configure from the panel
  sendavapayKey: text("sendavapay_key").notNull().default(""),
  sendavapayWebhookSecret: text("sendavapay_webhook_secret").notNull().default(""),
  usdtAddress: text("usdt_address").notNull().default(""),
  telegramGroupUrl: text("telegram_group_url").notNull().default(""),
  telegramChannelUrl: text("telegram_channel_url").notNull().default(""),
  whatsappGroupUrl: text("whatsapp_group_url").notNull().default(""),
  whatsappChannelUrl: text("whatsapp_channel_url").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlatformSettingsSchema = createInsertSchema(platformSettingsTable).omit({ id: true, updatedAt: true });
export type InsertPlatformSettings = z.infer<typeof insertPlatformSettingsSchema>;
export type PlatformSettings = typeof platformSettingsTable.$inferSelect;
