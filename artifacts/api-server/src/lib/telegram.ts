import { logger } from "./logger";

const TELEGRAM_API = "https://api.telegram.org";

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
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      logger.warn({ status: response.status }, "Telegram notification failed");
    }
  } catch (error) {
    logger.warn({ error }, "Telegram notification unavailable");
  }
}

export function formatTelegramAmount(amount: number | string): string {
  return `${Number(amount).toLocaleString("fr-FR")} FCFA`;
}