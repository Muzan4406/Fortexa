import { Router, type IRouter } from "express";
import { createHmac } from "crypto";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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
      const [tx] = await db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.sendavapayRef, payload.reference));

      if (!tx) {
        logger.warn({ reference: payload.reference }, "Webhook: transaction not found");
        res.json({ received: true });
        return;
      }

      // Idempotence: skip if already processed
      if (tx.status !== "pending") {
        logger.info({ txId: tx.id, status: tx.status }, "Webhook: transaction already processed");
        res.json({ received: true });
        return;
      }

      // Approve transaction
      await db
        .update(transactionsTable)
        .set({ status: "approved", description: "Dépôt Mobile Money confirmé automatiquement" })
        .where(eq(transactionsTable.id, tx.id));

      // Credit investment balance
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, tx.userId));

      if (user) {
        const effectiveAmount = parseFloat(tx.amount);
        const newBalance = parseFloat(user.investmentBalance) + effectiveAmount;
        await db
          .update(usersTable)
          .set({
            investmentBalance: newBalance.toFixed(8),
            // The earning clock begins at payment confirmation.
            lastGainUpdate: new Date(),
          })
          .where(eq(usersTable.id, tx.userId));

        // Distribute referral commissions
        await creditReferralCommissions(effectiveAmount, tx.userId, tx.id);

        logger.info(
          { userId: tx.userId, txId: tx.id, amount: effectiveAmount },
          "Deposit auto-approved via Sendavapay webhook"
        );
      }
    } else if (
      payload.event === "payment.failed" ||
      payload.event === "payment.expired"
    ) {
      const [tx] = await db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.sendavapayRef, payload.reference));

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
