import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase client for SERVER code (Server Components, Server Actions, Route
// Handlers). Unlike the admin client, this one acts AS THE LOGGED-IN USER — it
// reads their session from cookies, so RLS applies and they only see their own
// data.
//
// Note: `cookies()` is async in Next.js 16, hence `await` and the async function.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components aren't allowed to set cookies. That's fine — the
            // proxy (below) refreshes the session cookie instead, so we can
            // safely ignore this here.
          }
        },
      },
    }
  );
}
