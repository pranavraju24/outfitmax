"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { getStylist } from "@/lib/ai";
import { uploadGarmentImage } from "@/lib/wardrobe/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export type AddGarmentState = { error?: string; success?: boolean } | undefined;

// Handles "add a clothing photo to my wardrobe":
//   1. tag it with Gemini, 2. store the image, 3. save a garment row.
export async function addGarment(
  _prev: AddGarmentState,
  formData: FormData
): Promise<AddGarmentState> {
  const user = await requireUser();

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a photo to upload." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "That file doesn't look like an image." };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { error: "Image is too large (max 8 MB)." };
  }

  // The file's raw bytes — we need them twice: once as base64 for Gemini, once
  // to upload to storage.
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  // 1. Ask Gemini to describe/categorize the item.
  let tags;
  try {
    tags = await getStylist().tagGarment({ data: base64, mimeType: file.type });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not analyze the image.",
    };
  }

  // 2. Upload the image file to private storage.
  let storagePath: string;
  try {
    storagePath = await uploadGarmentImage(user.id, bytes, file.type);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not save the image.",
    };
  }

  // 3. Save the garment row. We use the admin client and set user_id ourselves.
  const supabase = createAdminClient();
  const { error } = await supabase.from("garments").insert({
    user_id: user.id,
    storage_path: storagePath,
    name: tags.name,
    category: tags.category,
    color: tags.color,
    pattern: tags.pattern,
    material: tags.material,
    season: tags.season,
    description: tags.description,
    tags: tags.tags,
  });
  if (error) {
    return { error: `Could not save to your closet: ${error.message}` };
  }

  // Tell Next.js the closet page's data changed so it re-renders with the new item.
  revalidatePath("/closet");
  return { success: true };
}

// Removes a garment (both its DB row and its stored image). Scoped to the
// logged-in user so nobody can delete someone else's item.
export async function deleteGarment(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createAdminClient();

  // Look up the image path so we can delete the file too.
  const { data: row } = await supabase
    .from("garments")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  await supabase.from("garments").delete().eq("id", id).eq("user_id", user.id);

  if (row?.storage_path) {
    await supabase.storage.from("garments").remove([row.storage_path]);
  }

  revalidatePath("/closet");
}
