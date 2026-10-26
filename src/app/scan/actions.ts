"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadGarmentImage } from "@/lib/wardrobe/storage";
import { getStylist } from "@/lib/ai";
import type { GarmentTags } from "@/lib/ai/types";

export type SaveScanResult = { ok?: boolean; error?: string };

// Saves ONE frame the user chose to keep. Full tagging happens here (once per
// kept item) — during live scanning we only ran the fast detector, so this is
// where we enrich the item with the complete attributes before storing it.
export async function saveScannedGarment(input: {
  image: string; // base64, no data: prefix
  mimeType: string;
}): Promise<SaveScanResult> {
  const user = await requireUser();
  const mimeType = input.mimeType || "image/jpeg";
  if (!input.image) return { error: "No image to save." };

  try {
    const tags = await getStylist().tagGarment({ data: input.image, mimeType });

    const bytes = Buffer.from(input.image, "base64");
    const storagePath = await uploadGarmentImage(user.id, bytes, mimeType);

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
      tags: tags.tags ?? [],
    });
    if (error) return { error: error.message };

    revalidatePath("/closet");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save item." };
  }
}

// Saves a garment using tags we ALREADY have (from multi-photo parsing), so we
// don't re-run the AI. The same source photo is stored for each parsed item.
export async function saveTaggedGarment(input: {
  image: string;
  mimeType: string;
  tags: GarmentTags;
}): Promise<SaveScanResult> {
  const user = await requireUser();
  const mimeType = input.mimeType || "image/jpeg";
  if (!input.image) return { error: "No image to save." };

  try {
    const bytes = Buffer.from(input.image, "base64");
    const storagePath = await uploadGarmentImage(user.id, bytes, mimeType);

    const t = input.tags;
    const supabase = createAdminClient();
    const { error } = await supabase.from("garments").insert({
      user_id: user.id,
      storage_path: storagePath,
      name: t.name,
      category: t.category,
      color: t.color,
      pattern: t.pattern,
      material: t.material,
      season: t.season,
      description: t.description,
      tags: t.tags ?? [],
    });
    if (error) return { error: error.message };

    revalidatePath("/closet");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save item." };
  }
}
