import webpush from "web-push";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const publicKey = process.env.VAPID_PUBLIC_KEY || "";
const privateKey = process.env.VAPID_PRIVATE_KEY || "";
const subject = process.env.VAPID_SUBJECT || "mailto:admin@fortexa.com";
let configured = false;

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export function getVapidPublicKey(): string {
  return publicKey;
}

export async function sendPushToUsers(
  userIds: number[],
  payload: { title: string; body: string; url?: string; tag?: string },
): Promise<void> {
  if (!configured || userIds.length === 0) return;
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