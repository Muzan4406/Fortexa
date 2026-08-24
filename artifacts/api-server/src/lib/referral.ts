import { db, usersTable, referralCommissionsTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getSettings } from "./settings";
import { logger } from "./logger";
import { sendPushToUsers } from "./push";

/**
 * When a deposit is approved, credit referral commissions to the upline chain (up to 3 levels).
 */
export async function creditReferralCommissions(
  depositAmount: number,
  userId: number,
  transactionId: number
): Promise<void> {
  const settings = await getSettings();
  const rates = [
    parseFloat(settings.level1Percent) / 100,
    parseFloat(settings.level2Percent) / 100,
    parseFloat(settings.level3Percent) / 100,
  ];

  let currentUserId = userId;

  for (let level = 1; level <= 3; level++) {
    const [user] = await db
      .select({ referredById: usersTable.referredById })
      .from(usersTable)
      .where(eq(usersTable.id, currentUserId));

    if (!user || !user.referredById) break;

    const referrerId = user.referredById;
    const commissionAmount = depositAmount * rates[level - 1];

    if (commissionAmount <= 0) {
      currentUserId = referrerId;
      continue;
    }

    // Credit to referrer's gain balance
    const [referrer] = await db.select().from(usersTable).where(eq(usersTable.id, referrerId));
    if (!referrer) break;

    const newGainBalance = parseFloat(referrer.gainBalance) + commissionAmount;
    await db
      .update(usersTable)
      .set({ gainBalance: newGainBalance.toFixed(8) })
      .where(eq(usersTable.id, referrerId));

    // Record the commission transaction
    await db.insert(transactionsTable).values({
      userId: referrerId,
      type: "commission",
      amount: commissionAmount.toFixed(8),
      fee: "0",
      netAmount: commissionAmount.toFixed(8),
      status: "approved",
      description: `Commission niveau ${level} sur dépôt`,
    });

    // Record in referral_commissions table
    await db.insert(referralCommissionsTable).values({
      referrerId,
      refereeId: userId,
      transactionId,
      level,
      amount: commissionAmount.toFixed(8),
    });

    logger.info({ referrerId, userId, level, commissionAmount }, "Referral commission credited");
    void sendPushToUsers([referrerId], {
      title: "Commission de parrainage reçue",
      body: `Vous avez reçu ${commissionAmount.toFixed(0)} FCFA de commission (niveau ${level}).`,
      url: "/referrals",
      tag: `commission-${transactionId}-${level}`,
    });
    currentUserId = referrerId;
  }
}
