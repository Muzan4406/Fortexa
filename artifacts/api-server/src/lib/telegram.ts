import { logger } from "./logger";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { and, count, desc, eq } from "drizzle-orm";
import { creditReferralCommissions } from "./referral";

const TELEGRAM_API = "https://api.telegram.org";

async function telegramRequest<T>(method: string, body: Record<string, unknown>): Promise<T | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) {
      logger.warn({ method, status: response.status }, "Telegram API request failed");
      return null;
    }
    return await response.json() as T;
  } catch (error) {
    logger.warn({ method, error }, "Telegram API request unavailable");
    return null;
  }
}

async function sendTelegramMessage(chatId: string | number, text: string): Promise<void> {
  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

export async function sendTelegramNotification(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    logger.warn(
      { missingToken: !token, missingChatId: !chatId },
      "Telegram notification skipped: configuration incomplete",
    );
    return;
  }

  try {
    await sendTelegramMessage(chatId, message);
  } catch (error) {
    logger.warn({ error }, "Telegram notification unavailable");
  }
}

type TelegramUpdate = {
  update_id: number;
  message?: {
    chat?: { id: number; type: string };
    from?: { id: number; is_bot?: boolean };
    text?: string;
  };
};

type PendingCommand = {
  chatId: number;
  userId: number;
  action: "approved" | "rejected";
  transactionId: number;
  reason?: string;
  expiresAt: number;
};

let commandOffset = 0;
let pollingStarted = false;
let pendingCommand: PendingCommand | null = null;

function configuredChatId(): string {
  return process.env.TELEGRAM_CHAT_ID?.trim() ?? "";
}

function isConfiguredGroup(chatId: number): boolean {
  return Boolean(configuredChatId()) && String(chatId) === configuredChatId();
}

async function isTelegramAdmin(chatId: number, userId: number): Promise<boolean> {
  const allowlist = (process.env.TELEGRAM_ADMIN_USER_IDS ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean);
  if (allowlist.includes(String(userId))) return true;
  type MemberResponse = { ok: boolean; result?: { status: string } };
  const result = await telegramRequest<MemberResponse>("getChatMember", {
    chat_id: chatId,
    user_id: userId,
  });
  return result?.ok === true && ["creator", "administrator"].includes(result.result?.status ?? "");
}

function commandHelp(): string {
  return [
    "🛠 Commandes Fortexa",
    "/stats — statistiques de la plateforme",
    "/user 12 — détail d’un utilisateur",
    "/depots — dépôts en attente",
    "/retraits — retraits en attente",
    "/approuver 123 — préparer une approbation",
    "/rejeter 123 motif — préparer un rejet",
    "/confirmer — confirmer l’action financière",
    "/annuler — annuler l’action",
  ].join("\n");
}

async function listPending(type: "deposit" | "withdrawal"): Promise<string> {
  const rows = await db.select().from(transactionsTable)
    .where(and(eq(transactionsTable.type, type), eq(transactionsTable.status, "pending")))
    .orderBy(desc(transactionsTable.createdAt)).limit(10);
  if (!rows.length) return type === "deposit" ? "✅ Aucun dépôt en attente." : "✅ Aucun retrait en attente.";
  return rows.map((tx) =>
    `#${tx.id} · ${formatTelegramAmount(tx.amount)} · utilisateur #${tx.userId}\n${tx.description ?? ""}`,
  ).join("\n\n");
}

async function executePendingCommand(command: PendingCommand): Promise<string> {
  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, command.transactionId));
  if (!tx || tx.status !== "pending") return `⚠️ La transaction #${command.transactionId} est introuvable ou déjà traitée.`;

  const [updated] = await db.update(transactionsTable).set({
    status: command.action,
    ...(command.reason ? { rejectionReason: command.reason } : {}),
  }).where(and(eq(transactionsTable.id, tx.id), eq(transactionsTable.status, "pending"))).returning();
  if (!updated) return `⚠️ La transaction #${tx.id} a déjà été traitée.`;

  if (tx.type === "deposit" && command.action === "approved") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
    if (user) {
      await db.update(usersTable).set({
        investmentBalance: (parseFloat(user.investmentBalance) + parseFloat(tx.amount)).toFixed(8),
        lastGainUpdate: new Date(),
      }).where(eq(usersTable.id, tx.userId));
      await creditReferralCommissions(parseFloat(tx.amount), tx.userId, tx.id);
    }
  }
  if (tx.type === "withdrawal" && command.action === "rejected") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
    if (user) {
      await db.update(usersTable).set({
        gainBalance: (parseFloat(user.gainBalance) + parseFloat(tx.amount)).toFixed(8),
      }).where(eq(usersTable.id, tx.userId));
    }
  }
  return `${command.action === "approved" ? "✅" : "❌"} Transaction #${tx.id} ${command.action === "approved" ? "approuvée" : "rejetée"}.`;
}

async function handleTelegramCommand(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message?.chat || !message.from || message.from.is_bot || !message.text) return;
  if (!isConfiguredGroup(message.chat.id) || !(await isTelegramAdmin(message.chat.id, message.from.id))) return;

  const [rawCommand, ...args] = message.text.trim().split(/\s+/);
  const command = rawCommand.toLowerCase().split("@")[0];
  let reply: string;
  if (command === "/aide" || command === "/help" || command === "/start") {
    reply = commandHelp();
  } else if (command === "/stats") {
    const [users, deposits, withdrawals] = await Promise.all([
      db.select({ value: count() }).from(usersTable),
      db.select({ value: count() }).from(transactionsTable).where(and(eq(transactionsTable.type, "deposit"), eq(transactionsTable.status, "pending"))),
      db.select({ value: count() }).from(transactionsTable).where(and(eq(transactionsTable.type, "withdrawal"), eq(transactionsTable.status, "pending"))),
    ]);
    reply = `📊 Statistiques Fortexa\nUtilisateurs : ${users[0]?.value ?? 0}\nDépôts en attente : ${deposits[0]?.value ?? 0}\nRetraits en attente : ${withdrawals[0]?.value ?? 0}`;
  } else if (command === "/user") {
    const search = args[0];
    if (!search) reply = "Utilisation : /user 12 ou /user email@example.com";
    else {
      const [user] = /^\d+$/.test(search)
        ? await db.select().from(usersTable).where(eq(usersTable.id, Number(search)))
        : await db.select().from(usersTable).where(eq(usersTable.email, search));
      reply = user
        ? `👤 Utilisateur #${user.id}\nNom : ${user.name}\nEmail : ${user.email}\nPays : ${user.country || "—"}\nInvestissement : ${formatTelegramAmount(user.investmentBalance)}\nGains : ${formatTelegramAmount(user.gainBalance)}\nStatut : ${user.status}`
        : "Utilisateur introuvable.";
    }
  } else if (command === "/depots") reply = await listPending("deposit");
  else if (command === "/retraits") reply = await listPending("withdrawal");
  else if (command === "/annuler") {
    pendingCommand = null;
    reply = "↩️ Action annulée.";
  } else if (command === "/approuver" || command === "/rejeter") {
    const transactionId = Number(args[0]);
    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      reply = `Utilisation : ${command} <id>${command === "/rejeter" ? " <motif>" : ""}`;
    } else {
      pendingCommand = {
        chatId: message.chat.id,
        userId: message.from.id,
        transactionId,
        action: command === "/approuver" ? "approved" : "rejected",
        reason: args.slice(1).join(" ") || undefined,
        expiresAt: Date.now() + 120_000,
      };
      reply = `⚠️ Confirmer ${command === "/approuver" ? "l’approbation" : "le rejet"} de la transaction #${transactionId} ?\nRéponds /confirmer dans les 2 minutes, ou /annuler.`;
    }
  } else if (command === "/confirmer") {
    if (!pendingCommand || pendingCommand.chatId !== message.chat.id || pendingCommand.userId !== message.from.id || pendingCommand.expiresAt < Date.now()) {
      pendingCommand = null;
      reply = "Aucune action en attente ou confirmation expirée.";
    } else {
      const action = pendingCommand;
      pendingCommand = null;
      reply = await executePendingCommand(action);
    }
  } else {
    return;
  }
  await sendTelegramMessage(message.chat.id, reply);
}

export function startTelegramCommandPolling(): void {
  if (pollingStarted || process.env.TELEGRAM_COMMANDS_ENABLED !== "true") return;
  pollingStarted = true;
  const poll = async () => {
    const result = await telegramRequest<{ ok: boolean; result?: TelegramUpdate[] }>("getUpdates", {
      offset: commandOffset,
      timeout: 20,
      allowed_updates: ["message"],
    });
    for (const update of result?.result ?? []) {
      commandOffset = update.update_id + 1;
      await handleTelegramCommand(update);
    }
    setTimeout(() => void poll(), 1000);
  };
  void poll();
  logger.info("Telegram command polling enabled");
}

export function formatTelegramAmount(amount: number | string): string {
  return `${Number(amount).toLocaleString("fr-FR")} FCFA`;
}