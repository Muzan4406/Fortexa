import { Router } from "express";
import { getTurnstileSiteKey, isTurnstileEnabled } from "../lib/turnstile";

const router = Router();

router.get("/config/public", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    turnstileEnabled: isTurnstileEnabled(),
    turnstileSiteKey: getTurnstileSiteKey(),
  });
});

export default router;