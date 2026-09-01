import { db, platformSettingsTable } from "@workspace/db";

function parseCountryList(value: string): string[] {
  return value
    .split(",")
    .map((country) => country.trim().toUpperCase())
    .filter(Boolean);
}

export async function getSettings() {
  const [settings] = await db.select().from(platformSettingsTable).limit(1);
  if (!settings) {
    // Seed default settings
    const [created] = await db.insert(platformSettingsTable).values({}).returning();
    return created;
  }
  return settings;
}

/** Public-facing settings (no sensitive keys) — used by business logic helpers */
export function formatSettings(s: Awaited<ReturnType<typeof getSettings>>) {
  return {
    dailyRatePercent: parseFloat(s.dailyRatePercent),
    maxCapital: parseFloat(s.maxCapital),
    minDeposit: parseFloat(s.minDeposit),
    minWithdrawal: parseFloat(s.minWithdrawal),
    withdrawalFeePercent: parseFloat(s.withdrawalFeePercent),
    gainsActive: s.gainsActive,
    maintenanceMode: s.maintenanceMode,
    maintenanceMessage: s.maintenanceMessage,
    level1Percent: parseFloat(s.level1Percent),
    level2Percent: parseFloat(s.level2Percent),
    level3Percent: parseFloat(s.level3Percent),
    telegramGroupUrl: s.telegramGroupUrl,
    telegramChannelUrl: s.telegramChannelUrl,
    whatsappGroupUrl: s.whatsappGroupUrl,
    whatsappChannelUrl: s.whatsappChannelUrl,
    whatsappSupportUrl: s.whatsappSupportUrl,
    activeDepositProvider: s.activeDepositProvider,
    manualDepositUrl: s.manualDepositUrl,
    manualDepositCountries: parseCountryList(s.manualDepositCountries),
  };
}

/**
 * Admin-facing settings — includes masked payment integration status.
 * Never returns the raw key/secret values; only whether they are configured.
 */
export function formatAdminSettings(s: Awaited<ReturnType<typeof getSettings>>) {
  return {
    ...formatSettings(s),
    sendavapayKeySet: s.sendavapayKey.length > 0,
    sendavapayWebhookSecretSet: s.sendavapayWebhookSecret.length > 0,
    usdtAddress: s.usdtAddress,
    manualDepositUrl: s.manualDepositUrl,
    manualDepositCountries: parseCountryList(s.manualDepositCountries),
    telegramGroupUrl: s.telegramGroupUrl,
    telegramChannelUrl: s.telegramChannelUrl,
    whatsappGroupUrl: s.whatsappGroupUrl,
    whatsappChannelUrl: s.whatsappChannelUrl,
    whatsappSupportUrl: s.whatsappSupportUrl,
    activeDepositProvider: s.activeDepositProvider,
    ashtechpayKeySet: s.ashtechpayKey.length > 0,
  };
}
