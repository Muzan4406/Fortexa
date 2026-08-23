// Plesk/Phusion Passenger startup file for Fortexa.
// Plesk provides PORT and the API reads it during startup.
import("./artifacts/api-server/dist/index.mjs").catch((error) => {
  console.error("Fortexa API failed to start:", error);
  process.exitCode = 1;
});