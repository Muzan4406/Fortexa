import { Router, type IRouter } from "express";
import { createHmac } from "crypto";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { and, eq, or } from "drizzle-orm";
import { creditReferralCommissions } from "../lib/referral";
import { logger } from "../lib/logger";
import { getSettings } from "../lib/settings";

const router: IRouter = Router();

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
            status: "rejected",
            rejectionReason:
              payload.event === "payment.expired"
                ? "Paiement expiré — le client n'a pas confirmé à temps"
                : "Paiement refusé ou erreur opérateur",
          })
          .where(eq(transactionsTable.id, tx.id));

        logger.info({ txId: tx.id, event: payload.event }, "Deposit rejected via webhook");
      }
    }
  } catch (err) {
    logger.error({ err, payload }, "Webhook processing error");
    // Still return 200 to avoid Sendavapay retrying for our internal errors
  }

  res.json({ received: true });
});

export default router;
