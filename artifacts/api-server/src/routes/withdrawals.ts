import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getSettings } from "../lib/settings";
import { updateGainBalance } from "../lib/gains";
import { formatTelegramAmount, sendTelegramNotification } from "../lib/telegram";

const router: IRouter = Router();
const MOBILE_MONEY_COUNTRIES = new Set(["TG", "BJ", "BF", "CI", "Togo", "Bénin", "Burkina Faso", "Côte d'Ivoire"]);
const COUNTRY_CODES: Record<string, string> = {
  TG: "Togo",
  BJ: "Bénin",
  BF: "Burkina Faso",
  CI: "Côte d'Ivoire",
};
const MOBILE_MONEY_OPERATORS: Record<string, Set<string>> = {
  TG: new Set(["Togocel", "Moov Africa"]),
  BJ: new Set(["MTN Mobile Money", "Moov Africa"]),
  BF: new Set(["Orange Money", "Moov Africa"]),
  CI: new Set(["Orange Money", "MTN MoMo", "Moov Money", "Wave"]),
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

router.get("/withdrawals", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const txs = await db
    .select()
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.type, "withdrawal")))
    .orderBy(desc(transactionsTable.createdAt));
  res.json(txs.map(formatTx));
});

router.post("/withdrawals", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { amount, usdtAddress, phone, country, operator } = req.body;

  const numAmount = parseFloat(amount);
  if (!numAmount || isNaN(numAmount)) {
    res.status(400).json({ error: "Montant invalide" });
    return;
  }

  const settings = await getSettings();
  const minWithdrawal = parseFloat(settings.minWithdrawal);
  const feeRate = parseFloat(settings.withdrawalFeePercent) / 100;

  if (numAmount < minWithdrawal) {
    res.status(400).json({ error: `Le montant minimum de retrait est ${minWithdrawal} FCFA` });
    return;
  }

  // Update gains and read current balance
  await updateGainBalance(userId);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Utilisateur non trouvé" });
    return;
  }

  const requestedCountry = typeof country === "string" && country.trim() ? country.trim() : user.country;
  const mobileMoneyUser = MOBILE_MONEY_COUNTRIES.has(requestedCountry);
  const operatorCountry = COUNTRY_CODES[requestedCountry] ?? requestedCountry;
  if (mobileMoneyUser) {
    if (!operator || typeof operator !== "string" || !MOBILE_MONEY_OPERATORS[operatorCountry]?.has(operator)) {
      res.status(400).json({ error: "Un opérateur Mobile Money valide est requis pour votre pays" });
      return;
    }
    if (!phone || typeof phone !== "string" || !/^\d{6,12}$/.test(phone.trim())) {
      res.status(400).json({ error: "Un numéro Mobile Money valide est requis pour votre pays" });
      return;
    }
  }
  if (!mobileMoneyUser && (!usdtAddress || typeof usdtAddress !== "string" || usdtAddress.trim().length < 26)) {
    res.status(400).json({ error: "Une adresse USDT BEP20 valide est requise pour votre pays" });
    return;
  }

  const gainBalance = parseFloat(user.gainBalance);
  if (numAmount > gainBalance) {
    res.status(400).json({ error: "Solde de gains insuffisant" });
    return;
  }

  const fee = numAmount * feeRate;
  const netAmount = numAmount - fee;
  const withdrawalMethod = mobileMoneyUser ? "mobile_money" : "usdt";

  // Deduct from gain balance immediately (hold funds)
  const newGainBalance = gainBalance - numAmount;
  await db
    .update(usersTable)
    .set({ gainBalance: newGainBalance.toFixed(8) })
    .where(eq(usersTable.id, userId));

  const [tx] = await db.insert(transactionsTable).values({
    userId,
    type: "withdrawal",
    amount: numAmount.toFixed(8),
    fee: fee.toFixed(8),
    netAmount: netAmount.toFixed(8),
    status: "pending",
    depositMethod: withdrawalMethod,
     payerCountry: requestedCountry,
    payerPhone: mobileMoneyUser ? phone.trim() : null,
    description: phone
         ? `Retrait Mobile Money — ${requestedCountry} — ${operator} — ${phone}`
        : usdtAddress
          ? `Retrait → USDT BEP20 : ${usdtAddress}`
          : "Demande de retrait",
  }).returning();

  void sendTelegramNotification(
    `💸 Nouvelle demande de retrait\nTransaction #${tx.id}\nUtilisateur #${userId}\nMontant : ${formatTelegramAmount(numAmount)}\nNet à envoyer : ${formatTelegramAmount(netAmount)}\nStatut : en attente`,
  );
  res.status(201).json(formatTx(tx));
});

export default router;
