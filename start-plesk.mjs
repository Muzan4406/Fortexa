// Plesk Node.js startup file.
// PORT is supplied by Plesk; the API validates and uses it at startup.
await import("./artifacts/api-server/dist/index.mjs");