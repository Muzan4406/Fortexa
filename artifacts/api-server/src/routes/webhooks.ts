import { Router, type IRouter } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { and, eq, or } from "drizzle-orm";
import { creditReferralCommissions } from "../lib/referral";
import { logger } from "../lib/logger";
import { getSettings } from "../lib/settings";
import { formatTelegramAmount, sendTelegramNotification } from "../lib/telegram";

const router: IRouter = Router();
const AUTO_PAYMENT_REVIEW_DESCRIPTION =
  "Dépôt Mobile Money — échec fournisseur, vérification manuelle requise";

router.post("/webhooks/ashtechpay", async (req, res): Promise<void> => {
  const secret = process.env.ASHTECHPAY_WEBHOOK_SECRET;
  const signature = req.headers["x-ashtechpay-signature"] as string | undefined;
  const rawBody: Buffer | undefined = (req as any).rawBody;
  if (!secret || !signature || !rawBody) {
    logger.warn("AshtechPay webhook rejected: signature configuration missing");
    res.status(401).json({ error: "Signature webhook requise" });
    return;
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  if (received.length !== expected.length || !timingSafeEqual(Buffer.from(received), Buffer.from(expected))) {
    logger.warn("AshtechPay webhook rejected: invalid signature");
    res.status(401).json({ error: "Signature invalide" });
    return;
  }
  const payload = req.body as {
    event?: string;
    transaction_id?: string;
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
  };
  logger.info({ event: payload.event, reference: payload.reference }, "AshtechPay webhook received");

  try {
    if (
      (payload.event === "payment.completed" || payload.status?.toLowerCase() === "success") &&
      (payload.reference || payload.transaction_id)
    ) {
      const references = [payload.reference, payload.transaction_id].filter(
        (value): value is string => Boolean(value),
      );
      const [tx] = await db
        .select()
        .from(transactionsTable)
        .where(or(
          ...references.map((reference) => eq(transactionsTable.sendavapayRef, reference)),
          ...references.map((reference) => eq(transactionsTable.ashtechTransactionId, reference)),
        ));
      if (tx) {
        const credited = await db.transaction(async (trx) => {
          const [approvedTx] = await trx
            .update(transactionsTable)
            .set({
              status: "approved",
              description: "Dépôt Mobile Money AshtechPay confirmé automatiquement",
            })
            .where(and(eq(transactionsTable.id, tx.id), eq(transactionsTable.status, "pending")))
            .returning();
          if (!approvedTx) return null;
          const [user] = await trx.select().from(usersTable).where(eq(usersTable.id, approvedTx.userId));
          if (!user) throw new Error(`User ${approvedTx.userId} not found`);
          // AshtechPay's credited_amount may be reduced by provider fees.
          // Fortexa credits the gross amount the user deposited; provider
          // fees must not reduce the user's investment capital.
          const amount = Number(approvedTx.amount);
          await trx.update(usersTable).set({
            investmentBalance: (parseFloat(user.investmentBalance) + amount).toFixed(8),
            lastGainUpdate: new Date(),
          }).where(eq(usersTable.id, approvedTx.userId));
          return { userId: approvedTx.userId, txId: approvedTx.id, amount };
        });
        if (credited) {
          await creditReferralCommissions(credited.amount, credited.userId, credited.txId);
          void sendTelegramNotification(
            `✅ Dépôt confirmé automatiquement\nTransaction #${credited.txId}\nUtilisateur #${credited.userId}\nMontant crédité : ${formatTelegramAmount(credited.amount)}`,
          );
        }
      }
    } else if (
      (payload.event === "payment.failed" ||
        payload.event === "payment.expired" ||
        ["failed", "rejected", "expired"].includes(payload.status?.toLowerCase() ?? "")) &&
      (payload.reference || payload.transaction_id)
    ) {
      const references = [payload.reference, payload.transaction_id].filter(
        (value): value is string => Boolean(value),
      );
       const [reviewTx] = await db.update(transactionsTable)
         .set({ description: AUTO_PAYMENT_REVIEW_DESCRIPTION })
        .where(and(
          or(
            ...references.map((reference) => eq(transactionsTable.sendavapayRef, reference)),
            ...references.map((reference) => eq(transactionsTable.ashtechTransactionId, reference)),
          ),
          eq(transactionsTable.status, "pending"),
        ))
        .returning();
       if (reviewTx) {
        void sendTelegramNotification(
           `⚠️ Dépôt AshtechPay à vérifier\nTransaction #${reviewTx.id}\nMontant : ${formatTelegramAmount(reviewTx.amount)}\nLe fournisseur a signalé un échec ; le dépôt reste en attente de décision admin.`,
        );
      }
    }
  } catch (err) {
    logger.error({ err, reference: payload.reference }, "AshtechPay webhook processing error");
  }
  res.json({ received: true, event: payload.event });
});

router.post("/webhooks/sendavapay", async (req, res): Promise<void> => {
  const sig = req.headers["x-sendavapay-signature"] as string | undefined;

  // Read webhook secret from DB settings (falls back to env for backwards compatibility)
  const settings = await getSettings();
  const secret = settings.sendavapayWebhookSecret || process.env.SENDAVAPAY_WEBHOOK_SECRET;

  // Verify HMAC signature when secret is configured
  if (secret) {
    if (!sig) {
      logger.warn("Sendavapay webhook: missing signature header");
      res.status(401).json({ error: "Signature manquante" });
      return;
    }
    // rawBody is attached by express.json verify option in app.ts
    const rawBody: Buffer | undefined = (req as any).rawBody;
    if (!rawBody) {
      logger.warn("Sendavapay webhook: rawBody not available");
      res.status(400).json({ error: "Corps brut indisponible" });
      return;
    }
    const expected =
      "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
    if (sig !== expected) {
      logger.warn({ sig, expected }, "Sendavapay webhook: invalid signature");
      res.status(401).json({ error: "Signature invalide" });
      return;
    }
  }

  const payload = req.body as {
    event: string;
    reference: string;
    externalReference?: string;
    status: string;
    amount: string;
    currency: string;
    customerPhone?: string;
    paymentMethod?: string;
    timestamp?: string;
  };

  logger.info({ event: payload.event, reference: payload.reference }, "Sendavapay webhook received");

  try {
    if (payload.event === "payment.completed") {
      const references = [payload.reference, payload.externalReference].filter(
        (value): value is string => Boolean(value),
      );
      const [tx] = await db
        .select()
        .from(transactionsTable)
        .where(or(...references.map((reference) => eq(transactionsTable.sendavapayRef, reference))));

      if (!tx) {
        logger.warn({ reference: payload.reference }, "Webhook: transaction not found");
        res.json({ received: true });
        return;
      }

      const credited = await db.transaction(async (trx) => {
        // Conditional update makes repeated/concurrent webhooks idempotent.
        const [approvedTx] = await trx
          .update(transactionsTable)
          .set({ status: "approved", description: "Dépôt Mobile Money confirmé automatiquement" })
          .where(and(eq(transactionsTable.id, tx.id), eq(transactionsTable.status, "pending")))
          .returning();
        if (!approvedTx) return null;

        const [user] = await trx
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, approvedTx.userId));
        if (!user) throw new Error(`User ${approvedTx.userId} not found for transaction ${approvedTx.id}`);

        const effectiveAmount = parseFloat(approvedTx.amount);
        const newBalance = parseFloat(user.investmentBalance) + effectiveAmount;
        await trx
          .update(usersTable)
          .set({
            investmentBalance: newBalance.toFixed(8),
            // The earning clock begins at payment confirmation.
            lastGainUpdate: new Date(),
          })
          .where(eq(usersTable.id, approvedTx.userId));

        return { userId: approvedTx.userId, txId: approvedTx.id, amount: effectiveAmount };
      });

      if (credited) {
        // Distribute referral commissions once the balance transaction commits.
        await creditReferralCommissions(credited.amount, credited.userId, credited.txId);
        logger.info(credited, "Deposit auto-approved via Sendavapay webhook");
      } else {
        logger.info({ txId: tx.id, status: tx.status }, "Webhook: transaction already processed");
      }
    } else if (
      payload.event === "payment.failed" ||
      payload.event === "payment.expired"
    ) {
      const references = [payload.reference, payload.externalReference].filter(
        (value): value is string => Boolean(value),
      );
      const [tx] = await db
        .select()
        .from(transactionsTable)
        .where(or(...references.map((reference) => eq(transactionsTable.sendavapayRef, reference))));

       if (tx && tx.status === "pending") {
        await db
          .update(transactionsTable)
          .set({
             description: AUTO_PAYMENT_REVIEW_DESCRIPTION,
          })
          .where(eq(transactionsTable.id, tx.id));

         logger.info({ txId: tx.id, event: payload.event }, "Deposit held for manual review after provider failure");
      }
    }
  } catch (err) {
    logger.error({ err, payload }, "Webhook processing error");
    // Still return 200 to avoid Sendavapay retrying for our internal errors
  }

  res.json({ received: true });
});

export default router;
