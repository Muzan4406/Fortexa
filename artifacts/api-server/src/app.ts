import express, { type Express } from "express";
import cors from "cors";
import { existsSync } from "fs";
import { join } from "path";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { API_PREFIX } from "./lib/runtime-paths";

const app: Express = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

// Security headers are set here so they also apply when Plesk proxies the
// domain directly to Node.js. Nginx can add stricter headers too, but the
// application must not depend on a panel-specific configuration.
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
    ].join("; "),
  );
  // Fortexa is deployed behind HTTPS on Plesk. Sending HSTS from the app
  // avoids relying on whether the reverse proxy forwards X-Forwarded-Proto.
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

type RateLimitEntry = { count: number; resetAt: number };
const authRateLimits = new Map<string, RateLimitEntry>();
function authRateLimit(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const requestPath = req.originalUrl.split("?")[0];
  const key = `${req.ip}:${requestPath}`;
  const isRegister = requestPath.endsWith("/register");
  const now = Date.now();
  const current = authRateLimits.get(key);
  if (!current || current.resetAt <= now) {
    if (authRateLimits.size > 5000) {
      for (const [entryKey, entry] of authRateLimits) {
        if (entry.resetAt <= now) authRateLimits.delete(entryKey);
      }
    }
    authRateLimits.set(key, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }
  if (current.count >= (isRegister ? 5 : 10)) {
    res.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000));
    res.status(429).json({ error: "Trop de tentatives. Réessayez dans une minute." });
    return;
  }
  current.count += 1;
  next();
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigins = new Set(
  [
    process.env.APP_URL,
    ...(process.env.REPLIT_DOMAINS?.split(",") ?? []).map((domain) => `https://${domain.trim()}`),
    "http://localhost:5173",
    "http://localhost:19420",
  ].filter(Boolean),
);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin non autorisée"));
  },
  credentials: true,
}));
app.use(`${API_PREFIX}/auth/login`, authRateLimit);
app.use(`${API_PREFIX}/auth/register`, authRateLimit);

// Store raw body buffer on the request for webhook HMAC verification
app.use(
  express.json({
    // Deposit proofs are sent as base64 images. The default 100kb parser
    // limit rejects normal phone screenshots with HTTP 413.
    limit: "15mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

// Serve screenshot uploads (USDT deposit proofs) through Fortexa's API prefix.
// Plesk can start app.js from either the project root or the API artifact
// directory, so keep both locations readable for proofs created before a
// restart/rebuild.
const uploadDirectories = [
  join(process.cwd(), "uploads"),
  join(process.cwd(), "artifacts", "api-server", "uploads"),
];
app.use(
  `${API_PREFIX}/uploads`,
  ...uploadDirectories.map((directory) => express.static(directory)),
);
// Keep the legacy path working for proofs created or linked by older builds.
app.use(
  "/uploads",
  ...uploadDirectories.map((directory) => express.static(directory)),
);

app.use(API_PREFIX, router);

// When Plesk forwards the domain root to Node.js, serve Fortexa's compiled
// frontend from the same process. This also keeps the app working if the
// hosting panel's static Document Root setting is not applied immediately.
const frontendCandidates = [
  join(process.cwd(), "artifacts", "fortexa", "public"),
  join(process.cwd(), "..", "fortexa", "public"),
];
const frontendDir =
  frontendCandidates.find((candidate) => existsSync(join(candidate, "index.html"))) ??
  frontendCandidates[0];

app.use(express.static(frontendDir));
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith(API_PREFIX)) {
    res.sendFile(join(frontendDir, "index.html"), (error) => {
      if (error && !res.headersSent) next(error);
    });
    return;
  }
  next();
});

export default app;
