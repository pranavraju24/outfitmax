"use server";
// ^ Everything in this file runs ONLY on the server. That's what makes it safe
//   to handle passwords here.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// The shape of what our form gets back: either nothing (success → we redirect)
// or an error message to show.
export type AuthState = { error: string } | undefined;

// One action handles both login and signup, told apart by a hidden "mode" field.
export async function authenticate(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const mode = String(formData.get("mode") ?? "login");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // Basic checks before we bother Supabase.
  if (!email || !password) {
    return { error: "Please enter both an email and a password." };
  }
  if (mode === "signup" && password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();

  if (mode === "signup") {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
  }

  // Success: send them to their closet. (redirect() must be called OUTSIDE a
  // try/catch — it works by throwing a special signal Next.js catches.)
  redirect("/closet");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
