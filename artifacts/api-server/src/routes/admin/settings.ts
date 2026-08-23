import { Router, type IRouter } from "express";
import { db, platformSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { getSettings, formatSettings, formatAdminSettings } from "../../lib/settings";

const router: IRouter = Router();

router.get("/admin/settings", requireAdmin, async (_req, res): Promise<void> => {
  const settings = await getSettings();
  res.json(formatAdminSettings(settings));
});

router.put("/admin/settings", requireAdmin, async (req, res): Promise<void> => {
  const {
    dailyRatePercent,
    maxCapital,
    minDeposit,
    minWithdrawal,
    withdrawalFeePercent,
    gainsActive,
    level1Percent,
    level2Percent,
    level3Percent,
    sendavapayKey,
    sendavapayWebhookSecret,
    ashtechpayKey,
    ashtechpayWebhookSecret,
    activeDepositProvider,
    usdtAddress,
    telegramGroupUrl,
    telegramChannelUrl,
    whatsappGroupUrl,
    whatsappChannelUrl,
  } = req.body;

  const settings = await getSettings();
  const updates: any = {};

  if (dailyRatePercent !== undefined) updates.dailyRatePercent = String(dailyRatePercent);
  if (maxCapital !== undefined) updates.maxCapital = String(maxCapital);
  if (minDeposit !== undefined) updates.minDeposit = String(minDeposit);
  if (minWithdrawal !== undefined) updates.minWithdrawal = String(minWithdrawal);
  if (withdrawalFeePercent !== undefined) updates.withdrawalFeePercent = String(withdrawalFeePercent);
  if (gainsActive !== undefined) updates.gainsActive = gainsActive;
  if (level1Percent !== undefined) updates.level1Percent = String(level1Percent);
  if (level2Percent !== undefined) updates.level2Percent = String(level2Percent);
  if (level3Percent !== undefined) updates.level3Percent = String(level3Percent);
  // Only update payment keys if a non-empty value is provided (prevents accidental clearing)
  if (sendavapayKey && typeof sendavapayKey === "string" && sendavapayKey.trim().length > 0) {
    updates.sendavapayKey = sendavapayKey.trim();
  }
  if (sendavapayWebhookSecret && typeof sendavapayWebhookSecret === "string" && sendavapayWebhookSecret.trim().length > 0) {
    updates.sendavapayWebhookSecret = sendavapayWebhookSecret.trim();
  }
  if (ashtechpayKey && typeof ashtechpayKey === "string" && ashtechpayKey.trim().length > 0) {
    updates.ashtechpayKey = ashtechpayKey.trim();
  }
  if (ashtechpayWebhookSecret && typeof ashtechpayWebhookSecret === "string" && ashtechpayWebhookSecret.trim().length > 0) {
    updates.ashtechpayWebhookSecret = ashtechpayWebhookSecret.trim();
  }
  if (activeDepositProvider !== undefined) {
    if (!["sendavapay", "ashtechpay"].includes(String(activeDepositProvider))) {
      res.status(400).json({ error: "Fournisseur de dépôt invalide" });
      return;
    }
    updates.activeDepositProvider = String(activeDepositProvider);
  }
  if (usdtAddress !== undefined) updates.usdtAddress = String(usdtAddress).trim();
  for (const [key, value] of Object.entries({
    telegramGroupUrl,
    telegramChannelUrl,
    whatsappGroupUrl,
    whatsappChannelUrl,
  })) {
    if (value !== undefined) {
      const normalized = String(value).trim();
      if (normalized && !/^https:\/\/(t\.me|telegram\.me|chat\.whatsapp\.com|whatsapp\.com)\//i.test(normalized)) {
        res.status(400).json({ error: "Les liens sociaux doivent être des URLs Telegram ou WhatsApp valides" });
        return;
      }
      updates[key] = normalized;
    }
  }

  const [updated] = await db
    .update(platformSettingsTable)
    .set(updates)
    .where(eq(platformSettingsTable.id, settings.id))
    .returning();

  res.json(formatAdminSettings(updated));
});

router.get("/admin/referral-settings", requireAdmin, async (_req, res): Promise<void> => {
  const settings = await getSettings();
  res.json({
    level1Percent: parseFloat(settings.level1Percent),
    level2Percent: parseFloat(settings.level2Percent),
    level3Percent: parseFloat(settings.level3Percent),
  });
});

router.put("/admin/referral-settings", requireAdmin, async (req, res): Promise<void> => {
  const { level1Percent, level2Percent, level3Percent } = req.body;
  const settings = await getSettings();
  const updates: any = {};

  if (level1Percent !== undefined) updates.level1Percent = String(level1Percent);
  if (level2Percent !== undefined) updates.level2Percent = String(level2Percent);
  if (level3Percent !== undefined) updates.level3Percent = String(level3Percent);

  const [updated] = await db
    .update(platformSettingsTable)
    .set(updates)
    .where(eq(platformSettingsTable.id, settings.id))
    .returning();

  res.json({
    level1Percent: parseFloat(updated.level1Percent),
    level2Percent: parseFloat(updated.level2Percent),
    level3Percent: parseFloat(updated.level3Percent),
  });
});

export default router;
