import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getSettings } from "./settings";

/**
 * Compute and persist the current gains for a user based on elapsed time.
 * This should be called before reading the user's gain balance.
 */
export async function updateGainBalance(userId: number): Promise<void> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return;

  const settings = await getSettings();
  if (!settings.gainsActive) return;

  const investmentBalance = parseFloat(user.investmentBalance);
  if (investmentBalance <= 0) return;

  const dailyRate = parseFloat(settings.dailyRatePercent) / 100;
  const perSecondRate = (investmentBalance * dailyRate) / 86400;

  const lastUpdate = user.lastGainUpdate;
  const now = new Date();
  const secondsElapsed = (now.getTime() - lastUpdate.getTime()) / 1000;

  if (secondsElapsed < 1) return;

  const gained = perSecondRate * secondsElapsed;
  const newGainBalance = parseFloat(user.gainBalance) + gained;

  await db
    .update(usersTable)
    .set({
      gainBalance: newGainBalance.toFixed(8),
      lastGainUpdate: now,
    })
    .where(eq(usersTable.id, userId));
}
