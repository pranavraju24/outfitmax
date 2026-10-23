"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { error?: string; success?: boolean } | undefined;

// Saves the editable profile fields. "upsert" = insert a row if none exists yet,
// otherwise update the existing one.
export async function updateProfile(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await requireUser();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: fullName || null,
    phone: phone || null,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}
