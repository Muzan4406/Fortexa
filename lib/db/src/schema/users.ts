import { pgTable, serial, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userStatusEnum = pgEnum("user_status", ["active", "suspended", "banned"]);
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  referralCode: text("referral_code").notNull().unique(),
  referredById: serial("referred_by_id"),
  investmentBalance: numeric("investment_balance", { precision: 20, scale: 8 }).notNull().default("0"),
  gainBalance: numeric("gain_balance", { precision: 20, scale: 8 }).notNull().default("0"),
  // Track when gains accumulation started (last time gain balance was updated server-side)
  lastGainUpdate: timestamp("last_gain_update", { withTimezone: true }).notNull().defaultNow(),
  status: userStatusEnum("status").notNull().default("active"),
  role: userRoleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastGainUpdate: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
