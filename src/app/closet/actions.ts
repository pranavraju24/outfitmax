"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { getStylist } from "@/lib/ai";
import { uploadGarmentImage } from "@/lib/wardrobe/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export type AddGarmentState =
  | { error?: string; success?: boolean; added?: number; note?: string }
  | undefined;

// Edit a garment's details (fix a mis-tag, rename, retag). Scoped to the owner.
export async function updateGarment(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const name = String(formData.get("name") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "").trim() || null;
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const supabase = createAdminClient();
  await supabase
    .from("garments")
    .update({ name, category, color, tags })
    .eq("id", id)
    .eq("user_id", user.id); // never let one user edit another's row

  revalidatePath("/closet");
}

// Processes ONE file into a garment: tag → store → insert. Returns an error
// message string on failure, or null on success.
async function addOneGarment(
  userId: string,
  file: File
): Promise<string | null> {
  if (!file.type.startsWith("image/")) return `${file.name}: not an image`;
  if (file.size > 8 * 1024 * 1024) return `${file.name}: too large (max 8 MB)`;

  try {
    // The file's raw bytes — needed as base64 for Gemini and to upload.
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const tags = await getStylist().tagGarment({
      data: base64,
      mimeType: file.type,
    });
    const storagePath = await uploadGarmentImage(userId, bytes, file.type);

    const supabase = createAdminClient();
    const { error } = await supabase.from("garments").insert({
      user_id: userId,
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
    if (error) return `${file.name}: ${error.message}`;
    return null;
  } catch (e) {
    return `${file.name}: ${e instanceof Error ? e.message : "failed"}`;
  }
}

// Handles "add clothing photos to my wardrobe". Accepts ONE OR MANY photos and
// saves each as its own garment. Processed one at a time to be gentle on
// Gemini's free-tier rate limits.
export async function addGarment(
  _prev: AddGarmentState,
  formData: FormData
): Promise<AddGarmentState> {
  const user = await requireUser();

  const files = formData
    .getAll("image")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return { error: "Please choose at least one photo to upload." };
  }

  let added = 0;
  const errors: string[] = [];
  for (const file of files) {
    const err = await addOneGarment(user.id, file);
    if (err) errors.push(err);
    else added++;
  }

  // Refresh the closet with whatever got added.
  revalidatePath("/closet");

  if (added === 0) {
    return { error: errors[0] ?? "Nothing could be added." };
  }
  return {
    success: true,
    added,
    note: errors.length
      ? `${errors.length} photo${errors.length === 1 ? "" : "s"} couldn't be added.`
      : undefined,
  };
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
