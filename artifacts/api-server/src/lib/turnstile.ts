import { logger } from "./logger";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export function getTurnstileSiteKey(): string | null {
  return process.env.TURNSTILE_SITE_KEY?.trim() || process.env.VITE_TURNSTILE_SITE_KEY?.trim() || null;
}

export async function verifyTurnstileToken(token: unknown, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return true;
  if (typeof token !== "string" || token.length < 10 || token.length > 4096) return false;

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return false;
    const result = await response.json() as { success?: boolean };
    return result.success === true;
  } catch (error) {
    logger.warn({ error }, "Turnstile verification unavailable");
    return false;
  }
}