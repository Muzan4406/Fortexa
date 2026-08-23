// Plesk/Phusion Passenger startup file for Fortexa.
// Plesk provides PORT and the API reads it during startup.
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

process.env.FORTEXA_API_PREFIX ??= "/api";
process.env.FORTEXA_WEB_PREFIX ??= "/";

import("./artifacts/api-server/dist/index.mjs").catch((error) => {
  console.error("Fortexa API failed to start; serving frontend-only mode:", error);

  // The login screen must remain visible before DATABASE_URL and payment
  // settings are configured. API features become available after the missing
  // environment variables are added and Node.js is restarted.
  const publicDir = resolve(process.cwd(), "artifacts", "fortexa", "public");
  const indexFile = join(publicDir, "index.html");
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".webmanifest": "application/manifest+json",
  };

  createServer((req, res) => {
    if (!existsSync(indexFile)) {
      res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Fortexa frontend build is missing.");
      return;
    }

    const requestedPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const candidate = resolve(publicDir, `.${requestedPath}`);
    const insidePublicDir = candidate === publicDir || candidate.startsWith(`${publicDir}/`);
    const filePath = insidePublicDir && existsSync(candidate) && statSync(candidate).isFile()
      ? candidate
      : indexFile;

    res.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(readFileSync(filePath));
  }).listen(Number(process.env.PORT || 8080), () => {
    console.log(`Fortexa frontend-only fallback listening on port ${process.env.PORT || 8080}`);
  });
});