import "server-only";
// ^ This special import makes the build FAIL if this file is ever accidentally
//   imported into browser (client) code. That's a safety guard, because this
//   file uses the secret key below.

import { createClient } from "@supabase/supabase-js";

// A privileged Supabase client for TRUSTED SERVER CODE ONLY.
//
// It authenticates with the SECRET key, which bypasses Row Level Security (RLS)
// — i.e. it can read/write any row. That's fine on the server (where we control
// the logic and always scope queries to the right user), but it must NEVER reach
// the browser. The "server-only" import above enforces that at build time.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

export function createAdminClient() {
  if (!url || !secretKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Add them to .env.local and restart the dev server."
    );
  }

  return createClient(url, secretKey, {
    // We don't want this server client to persist or refresh a user session —
    // it's not tied to any single logged-in user.
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
