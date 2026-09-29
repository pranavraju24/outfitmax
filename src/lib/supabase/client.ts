import { createBrowserClient } from "@supabase/ssr";

// Supabase client for BROWSER (client component) code.
//
// It uses the PUBLISHABLE key, which is safe to ship to the browser because Row
// Level Security still guards every query. This client automatically reads the
// logged-in user's session from cookies.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
