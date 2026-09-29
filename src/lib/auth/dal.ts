import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Data Access Layer (DAL): the ONE place we check "who is logged in?".
// Centralizing this (Next.js's recommended pattern) means we can't forget an
// auth check in some corner of the app.
// ============================================================================

// Returns the current user, or null if nobody is logged in.
// React's `cache` means if we call this several times while rendering one page,
// it only actually asks Supabase once.
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// Use this on pages that REQUIRE a login. Guests get sent to /login.
export async function requireUser() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
