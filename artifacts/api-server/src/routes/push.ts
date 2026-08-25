import { Router, type IRouter } from "express";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getVapidPublicKey, sendPushToUsers } from "../lib/push";

const router: IRouter = Router();

router.get("/push/vapid-public-key", (_req, res) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    res.status(503).json({ error: "Push non configuré" });
    return;
  }
  res.json({ publicKey });
});

router.post("/push/subscribe", requireAuth, async (req, res): Promise<void> => {
  const { endpoint, keys, expirationTime } = req.body ?? {};
  if (typeof endpoint !== "string" || !endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: "Abonnement push invalide" });
    return;
  }

  await db.insert(pushSubscriptionsTable).values({
    userId: req.userId!,
    endpoint,
    p256dh: String(keys.p256dh),
    auth: String(keys.auth),
    expirationTime: expirationTime == null ? null : String(expirationTime),
  }).onConflictDoUpdate({
    target: pushSubscriptionsTable.endpoint,
    set: {
      userId: req.userId!,
      p256dh: String(keys.p256dh),
      auth: String(keys.auth),
      expirationTime: expirationTime == null ? null : String(expirationTime),
      updatedAt: new Date(),
    },
  });

  res.status(204).send();
});

router.delete("/push/subscribe", requireAuth, async (req, res): Promise<void> => {
  const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : "";
  if (endpoint) {
    await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint));
  }
  res.status(204).send();
});

router.post("/push/test", requireAuth, async (req, res): Promise<void> => {
  const report = await sendPushToUsers([req.userId!], {
    title: "Test Fortexa",
    body: "Les notifications push de Fortexa fonctionnent.",
    url: "/profile",
    tag: `push-test-${Date.now()}`,
  });
  res.json(report);
});

export default router;