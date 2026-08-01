import { db, platformSettingsTable } from "@workspace/db";

export async function getSettings() {
  const [settings] = await db.select().from(platformSettingsTable).limit(1);
  if (!settings) {
    // Seed default settings
    const [created] = await db.insert(platformSettingsTable).values({}).returning();
    return created;
  }
  return settings;
}

export function formatSettings(s: Awaited<ReturnType<typeof getSettings>>) {
  return {
    dailyRatePercent: parseFloat(s.dailyRatePercent),
    maxCapital: parseFloat(s.maxCapital),
    minDeposit: parseFloat(s.minDeposit),
    minWithdrawal: parseFloat(s.minWithdrawal),
    withdrawalFeePercent: parseFloat(s.withdrawalFeePercent),
    gainsActive: s.gainsActive,
    level1Percent: parseFloat(s.level1Percent),
    level2Percent: parseFloat(s.level2Percent),
    level3Percent: parseFloat(s.level3Percent),
  };
}
