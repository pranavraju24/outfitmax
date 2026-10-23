import { execSync } from "node:child_process";

// Reads the LOCAL Supabase connection details from the running stack
// (`npx supabase status`). This way the integration tests use whatever keys the
// local dev stack generated — nothing sensitive is hardcoded, and it works on
// any machine that ran `npx supabase start`.
function readLocalStatus(): Record<string, string> {
  let out: string;
  try {
    out = execSync("npx --yes supabase@latest status -o env", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(
      "Local Supabase isn't running. Start it with `npx supabase start` before running integration tests."
    );
  }

  const env: Record<string, string> = {};
  for (const line of out.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const status = readLocalStatus();

export const SUPABASE_URL = status.API_URL;
export const ANON_KEY = status.ANON_KEY;
export const SERVICE_ROLE_KEY = status.SERVICE_ROLE_KEY;
