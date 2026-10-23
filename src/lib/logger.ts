import pino from "pino";

// Structured JSON logger for server-side code. In production this emits one JSON
// object per line (easy for log collectors to parse); during tests it's silent.
// Level is controlled by LOG_LEVEL (default "info").
export const logger = pino({
  level: process.env.VITEST ? "silent" : process.env.LOG_LEVEL ?? "info",
  base: { app: "outfitmax" },
});
