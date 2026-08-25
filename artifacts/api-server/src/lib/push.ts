import webpush from "web-push";
import { db, pushSubscriptionsTable, usersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

let configured = false;

function initPush(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || process.env.VAPID_CONTACT || "mailto:admin@fortexa.com",
    publicKey,
    privateKey,
  );
  configured = true;
  return true;
}

export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || "";
}

export async function sendPushToUsers(
  userIds: number[],
  payload: { title: string; body: string; url?: string; tag?: string },
): Promise<void> {
  if (!initPush() || userIds.length === 0) {
    if (userIds.length > 0) console.warn("Push notifications are not configured");
    return;
  }
  const subscriptions = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(inArray(pushSubscriptionsTable.userId, [...new Set(userIds)]));

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(payload),
      );
    } catch (error: any) {
      if (error?.statusCode === 401 || error?.statusCode === 403 || error?.statusCode === 404 || error?.statusCode === 410) {
        await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.id, subscription.id));
      } else {
        console.warn("Push notification failed", error?.statusCode || error?.message);
      }
    }
  }));
}

export async function sendPushToAdmins(
  payload: { title: string; body: string; url?: string; tag?: string },
): Promise<void> {
  const admins = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.role, "admin"));
  await sendPushToUsers(admins.map((admin) => admin.id), payload);
}