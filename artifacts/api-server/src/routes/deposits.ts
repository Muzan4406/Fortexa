import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { requireAuth } from "../lib/auth";
import { getSettings } from "../lib/settings";
import { apiPath } from "../lib/runtime-paths";
import {
  createPayment,
  getOperators,
  initiatePayment,
  submitOtp,
} from "../lib/sendavapay";

const router: IRouter = Router();

/** Countries supported by Sendavapay Mobile Money (XOF) */
const XOF_COUNTRIES = new Set(["TG", "BJ", "BF", "CI"]);

/** Phone prefix per country */
const COUNTRY_PREFIX: Record<string, string> = {
  TG: "+228",
  BJ: "+229",
  BF: "+226",
  CI: "+225",
};

function formatTx(t: typeof transactionsTable.$inferSelect) {
  return {
    id: t.id,
    userId: t.userId,
    type: t.type,
    amount: parseFloat(t.amount),
    fee: parseFloat(t.fee),
    netAmount: parseFloat(t.netAmount),
    status: t.status,
    description: t.description ?? null,
    rejectionReason: t.rejectionReason ?? null,
    depositMethod: t.depositMethod ?? null,
    payerCountry: t.payerCountry ?? null,
    payerPhone: t.payerPhone ?? null,
    sendavapayRef: t.sendavapayRef ?? null,
    txid: t.txid ?? null,
    screenshotPath: t.screenshotPath ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

/** Save a base64-encoded screenshot to disk and return its URL path */
async function saveScreenshot(base64: string, userId: number): Promise<string> {
  const uploadsDir = join(process.cwd(), "uploads");
  await mkdir(uploadsDir, { recursive: true });

  // Strip optional data-URL prefix (e.g. "data:image/png;base64,")
  const data = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(data, "base64");

  const filename = `dep_${userId}_${Date.now()}.jpg`;
  await writeFile(join(uploadsDir, filename), buffer);
  return apiPath(`/uploads/${filename}`);
}

// ─── Existing endpoints ───────────────────────────────────────────────────────

router.get("/deposits", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const txs = await db
    .select()
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.type, "deposit")))
    .orderBy(desc(transactionsTable.createdAt));

  res.json(txs.map(formatTx));
});

// Legacy manual deposit (kept for backward compat / admin-created deposits)
router.post("/deposits", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { amount } = req.body;

  const numAmount = parseFloat(amount);
  if (!numAmount || isNaN(numAmount)) {
    res.status(400).json({ error: "Montant invalide" });
    return;
  }

  const settings = await getSettings();
  const minDeposit = parseFloat(settings.minDeposit);
  const maxCapital = parseFloat(settings.maxCapital);

  if (numAmount < minDeposit) {
    res.status(400).json({ error: `Le montant minimum est ${minDeposit} FCFA` });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }

  const currentCapital = parseFloat(user.investmentBalance);
  if (currentCapital + numAmount > maxCapital) {
    res.status(400).json({ error: `Capital maximum de ${maxCapital} FCFA atteint` });
    return;
  }

  const [tx] = await db
    .insert(transactionsTable)
    .values({
      userId,
      type: "deposit",
      amount: numAmount.toFixed(8),
      fee: "0",
      netAmount: numAmount.toFixed(8),
      status: "pending",
      description: "Demande de dépôt",
    })
    .returning();

  res.status(201).json(formatTx(tx));
});

// ─── Mobile Money — Sendavapay ────────────────────────────────────────────────

/**
 * POST /deposits/initiate
 * Creates a Sendavapay payment and returns the paymentToken + available operators.
 * The frontend uses the result to render Step 2 (confirmation + operator selection).
 */
router.post("/deposits/initiate", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { amount, payerCountry, payerPhone } = req.body as {
    amount: unknown;
    payerCountry: unknown;
    payerPhone: unknown;
  };

  if (!payerCountry || typeof payerCountry !== "string" || !XOF_COUNTRIES.has(payerCountry)) {
    res.status(400).json({ error: "Pays non pris en charge pour Mobile Money" });
    return;
  }

  if (!payerPhone || typeof payerPhone !== "string" || !/^\d{6,12}$/.test(payerPhone.trim())) {
    res.status(400).json({ error: "Numéro de téléphone invalide (chiffres uniquement, sans indicatif)" });
    return;
  }

  const numAmount = parseFloat(String(amount));
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: "Montant invalide" });
    return;
  }

  const settings = await getSettings();
  const minDeposit = parseFloat(settings.minDeposit);
  const maxCapital = parseFloat(settings.maxCapital);

  if (numAmount < minDeposit) {
    res.status(400).json({ error: `Montant minimum : ${minDeposit} FCFA` });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }

  const currentCapital = parseFloat(user.investmentBalance);
  if (currentCapital + numAmount > maxCapital) {
    res.status(400).json({ error: `Capital maximum de ${maxCapital} FCFA atteint` });
    return;
  }

  // Format phone to E.164
  const prefix = COUNTRY_PREFIX[payerCountry];
  const digitsOnly = payerPhone.trim().replace(/^0+/, "");
  const fullPhone = `${prefix}${digitsOnly}`;

  // Build webhook URL from runtime domain
  const domain =
    process.env.APP_URL?.replace(/^https?:\/\//, "").replace(/\/+$/, "") ||
    process.env.REPLIT_DEV_DOMAIN ||
    process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  const webhookUrl = domain
    ? `https://${domain}${apiPath("/webhooks/sendavapay")}`
    : "";

  const externalReference = `fortexa_dep_${userId}_${Date.now()}`;

  // Read SDK key from DB settings (admin-configurable)
  const sendavapayKey = settings.sendavapayKey || process.env.SENDAVAPAY_SDK_KEY || "";
  if (!sendavapayKey) {
    res.status(503).json({ error: "Paiement Mobile Money non configuré — contactez l'administrateur" });
    return;
  }

  const payment = await createPayment(sendavapayKey, {
    amount: numAmount,
    currency: "XOF",
    description: "Dépôt Fortexa",
    customerName: user.name,
    customerEmail: user.email,
    customerPhone: fullPhone,
    payerCountry,
    webhookUrl,
    externalReference,
  });

  if (!payment.success || !payment.data) {
    res.status(400).json({ error: payment.error ?? "Erreur de création du paiement Sendavapay" });
    return;
  }

  const { reference, paymentToken } = payment.data;

  // Persist pending transaction with Sendavapay reference
  const [tx] = await db
    .insert(transactionsTable)
    .values({
      userId,
      type: "deposit",
      amount: numAmount.toFixed(8),
      fee: "0",
      netAmount: numAmount.toFixed(8),
      status: "pending",
      depositMethod: "mobile_money",
      payerCountry,
      payerPhone: fullPhone,
      sendavapayRef: reference,
      sendavapayPaymentToken: paymentToken,
      description: "Dépôt Mobile Money — en attente",
    })
    .returning();

  // Fetch online operators for this country
  const operatorsResult = await getOperators(payerCountry);
  const operators =
    operatorsResult.success && operatorsResult.data
      ? operatorsResult.data.filter((op) => op.status === "online")
      : [];

  res.json({
    transactionId: tx.id,
    reference,
    amount: numAmount,
    payerCountry,
    payerPhone: fullPhone,
    operators,
  });
});

/**
 * POST /deposits/confirm
 * Initiates the Mobile Money push to the user's phone.
 */
router.post("/deposits/confirm", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { transactionId, operatorId } = req.body as {
    transactionId: unknown;
    operatorId: unknown;
  };

  if (!transactionId || !operatorId) {
    res.status(400).json({ error: "transactionId et operatorId requis" });
    return;
  }

  const [tx] = await db
    .select()
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.id, Number(transactionId)),
        eq(transactionsTable.userId, userId)
      )
    );

  if (!tx || !tx.sendavapayPaymentToken) {
    res.status(404).json({ error: "Transaction non trouvée ou déjà utilisée" });
    return;
  }

  if (tx.status !== "pending") {
    res.status(400).json({ error: "Cette transaction a déjà été traitée" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }

  const result = await initiatePayment({
    paymentToken: tx.sendavapayPaymentToken,
    payerName: user.name,
    payerPhone: tx.payerPhone!,
    payerEmail: user.email,
    payerCountry: tx.payerCountry!,
    operatorId: String(operatorId),
  });

  if (!result.success) {
    logger.warn(
      { transactionId: tx.id, payerCountry: tx.payerCountry, operatorId: String(operatorId), code: result.code, providerMessage: result.error ?? result.message },
      "Sendavapay payment initiation failed",
    );
    res.status(400).json({ error: result.error ?? result.message ?? "Échec de l'initiation du paiement" });
    return;
  }

  res.json({
    requiresOtp: result.requiresOtp ?? false,
    otpToken: result.otpToken ?? null,
    requiresRedirect: result.requiresRedirect ?? false,
    redirectUrl: result.redirectUrl ?? null,
    reference: result.reference ?? tx.sendavapayRef,
  });
});

/**
 * POST /deposits/submit-otp
 * Submits the OTP code for Orange Money operators.
 */
router.post("/deposits/submit-otp", requireAuth, async (req, res): Promise<void> => {
  const { otpToken, otp } = req.body as { otpToken: unknown; otp: unknown };

  if (!otpToken || !otp) {
    res.status(400).json({ error: "otpToken et otp requis" });
    return;
  }

  const result = await submitOtp({
    otpToken: String(otpToken),
    otp: String(otp),
  });

  if (!result.success) {
    res.status(400).json({ error: result.error ?? "OTP invalide" });
    return;
  }

  res.json({ success: true, message: result.message ?? null });
});

/**
 * GET /deposits/usdt-info
 * Returns USDT wallet address and current XOF/USDT rate.
 */
router.get("/deposits/usdt-info", requireAuth, async (req, res): Promise<void> => {
  const settings = await getSettings();
  // Read USDT address from DB settings (admin-configurable), fallback to env
  const address = settings.usdtAddress || process.env.USDT_ADDRESS || "";

  let usdtRate = 655; // fallback: approximate XOF/USD (CFA peg)
  try {
    const rateRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=xof",
      { signal: AbortSignal.timeout(3000) }
    );
    if (rateRes.ok) {
      const rateData = (await rateRes.json()) as { tether?: { xof?: number } };
      if (rateData?.tether?.xof) usdtRate = rateData.tether.xof;
    }
  } catch {
    // Use fallback silently
  }

  res.json({ address, usdtRate });
});

/**
 * GET /deposits/:id/status
 * Returns the current DB status of a deposit — used for polling.
 */
router.get("/deposits/:id/status", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "ID invalide" });
    return;
  }

  const [tx] = await db
    .select()
    .from(transactionsTable)
    .where(and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)));

  if (!tx) {
    res.status(404).json({ error: "Transaction non trouvée" });
    return;
  }

  res.json({
    id: tx.id,
    status: tx.status,
    amount: parseFloat(tx.amount),
    depositMethod: tx.depositMethod ?? null,
    createdAt: tx.createdAt.toISOString(),
  });
});

/**
 * POST /deposits/usdt
 * Submits a USDT (BEP20) deposit request for admin review.
 */
router.post("/deposits/usdt", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { amount, payerCountry, txid, screenshotBase64 } = req.body as {
    amount: unknown;
    payerCountry: unknown;
    txid: unknown;
    screenshotBase64: unknown;
  };

  const numAmount = parseFloat(String(amount));
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: "Montant invalide" });
    return;
  }

  const settings = await getSettings();
  const minDeposit = parseFloat(settings.minDeposit);
  if (numAmount < minDeposit) {
    res.status(400).json({ error: `Montant minimum : ${minDeposit} FCFA` });
    return;
  }

  if (!txid || typeof txid !== "string" || txid.trim().length < 10) {
    res.status(400).json({ error: "Hash de transaction (TXID) invalide" });
    return;
  }

  if (!screenshotBase64 || typeof screenshotBase64 !== "string") {
    res.status(400).json({ error: "Capture d'écran requise" });
    return;
  }

  let screenshotPath: string;
  try {
    screenshotPath = await saveScreenshot(screenshotBase64, userId);
  } catch {
    res.status(400).json({ error: "Impossible de traiter la capture d'écran" });
    return;
  }

  const [tx] = await db
    .insert(transactionsTable)
    .values({
      userId,
      type: "deposit",
      amount: numAmount.toFixed(8),
      fee: "0",
      netAmount: numAmount.toFixed(8),
      status: "pending",
      depositMethod: "usdt",
      payerCountry: typeof payerCountry === "string" ? payerCountry : null,
      txid: txid.trim(),
      screenshotPath,
      description: "Dépôt USDT (BEP20) — en attente de vérification",
    })
    .returning();

  res.status(201).json(formatTx(tx));
});

export { formatTx };
export default router;
