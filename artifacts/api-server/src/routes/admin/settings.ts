import { Router, type IRouter } from "express";
import { db, platformSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { getSettings, formatSettings, formatAdminSettings } from "../../lib/settings";

const router: IRouter = Router();

router.get("/admin/settings", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const settings = await getSettings();
    res.json(formatAdminSettings(settings));
  } catch (error) {
    console.error("Admin settings read failed", error);
    res.status(500).json({
      error: "Impossible de lire les paramètres. La base de production doit être mise à jour.",
    });
  }
});

router.put("/admin/settings", requireAdmin, async (req, res): Promise<void> => {
  const {
    dailyRatePercent,
    maxCapital,
    minDeposit,
    minWithdrawal,
    withdrawalFeePercent,
    gainsActive,
    maintenanceMode,
    maintenanceMessage,
    level1Percent,
    level2Percent,
    level3Percent,
    sendavapayKey,
    sendavapayWebhookSecret,
    ashtechpayKey,
    activeDepositProvider,
    usdtAddress,
    manualDepositUrl,
    manualDepositCountries,
    whatsappGroupUrl,
    whatsappChannelUrl,
    whatsappSupportUrl,
  } = req.body;

  const updates: any = {};

  if (dailyRatePercent !== undefined) {
    const rate = Number(dailyRatePercent);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      res.status(400).json({ error: "Le rendement journalier doit être compris entre 0 et 100 %" });
      return;
    }
    updates.dailyRatePercent = rate.toString();
  }
  if (maxCapital !== undefined) updates.maxCapital = String(maxCapital);
  if (minDeposit !== undefined) updates.minDeposit = String(minDeposit);
  if (minWithdrawal !== undefined) updates.minWithdrawal = String(minWithdrawal);
  if (withdrawalFeePercent !== undefined) updates.withdrawalFeePercent = String(withdrawalFeePercent);
  if (gainsActive !== undefined) updates.gainsActive = gainsActive;
  if (maintenanceMode !== undefined) updates.maintenanceMode = Boolean(maintenanceMode);
  if (maintenanceMessage !== undefined) {
    const message = String(maintenanceMessage).trim();
    if (message.length < 5 || message.length > 500) {
      res.status(400).json({ error: "Le message de maintenance doit contenir entre 5 et 500 caractères" });
      return;
    }
    updates.maintenanceMessage = message;
  }
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
  if (activeDepositProvider !== undefined) {
    if (!["sendavapay", "ashtechpay"].includes(String(activeDepositProvider))) {
      res.status(400).json({ error: "Fournisseur de dépôt invalide" });
      return;
    }
    updates.activeDepositProvider = String(activeDepositProvider);
  }
  if (usdtAddress !== undefined) updates.usdtAddress = String(usdtAddress).trim();
  if (manualDepositUrl !== undefined) {
    const normalized = String(manualDepositUrl).trim();
    if (normalized) {
      try {
        const parsed = new URL(normalized);
        if (parsed.protocol !== "https:") throw new Error("invalid protocol");
      } catch {
        res.status(400).json({ error: "Le lien de paiement manuel doit être une URL HTTPS valide" });
        return;
      }
    }
    updates.manualDepositUrl = normalized;
  }
  if (manualDepositCountries !== undefined) {
    if (!Array.isArray(manualDepositCountries)) {
      res.status(400).json({ error: "La liste des pays du paiement manuel est invalide" });
      return;
    }
    updates.manualDepositCountries = manualDepositCountries
      .map((country: unknown) => String(country).trim().toUpperCase())
      .filter(Boolean)
      .join(",");
  }
  for (const [key, value] of Object.entries({
    whatsappGroupUrl,
    whatsappChannelUrl,
    whatsappSupportUrl,
  })) {
    if (value !== undefined) {
      const normalized = String(value).trim();
      if (normalized && !/^https:\/\/(t\.me|telegram\.me|chat\.whatsapp\.com|whatsapp\.com|wa\.me)\//i.test(normalized)) {
        res.status(400).json({ error: "Les liens sociaux doivent être des URLs Telegram ou WhatsApp valides" });
        return;
      }
      updates[key] = normalized;
    }
  }

  try {
    const settings = await getSettings();
    const [updated] = await db
      .update(platformSettingsTable)
      .set(updates)
      .where(eq(platformSettingsTable.id, settings.id))
      .returning();

    if (!updated) {
      res.status(500).json({ error: "Paramètres introuvables" });
      return;
    }
    res.json(formatAdminSettings(updated));
  } catch (error) {
    req.log.error({ err: error }, "Admin settings update failed");
    res.status(500).json({
      error: "Impossible d'enregistrer les paramètres. Vérifiez que la base de production contient les colonnes AshtechPay.",
    });
  }
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
