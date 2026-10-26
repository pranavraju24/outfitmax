"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadGarmentImage } from "@/lib/wardrobe/storage";
import type { GarmentTags } from "@/lib/ai/types";

export type SaveScanResult = { ok?: boolean; error?: string };

// Saves ONE already-detected frame to the wardrobe. The frame was tagged live by
// /api/scan; here we just store the image + insert the row (no second AI call).
export async function saveScannedGarment(input: {
  image: string; // base64, no data: prefix
  mimeType: string;
  tags: GarmentTags;
}): Promise<SaveScanResult> {
  const user = await requireUser();
  const { image, mimeType, tags } = input;

  if (!image) return { error: "No image to save." };

  try {
    const bytes = Buffer.from(image, "base64");
    const storagePath = await uploadGarmentImage(
      user.id,
      bytes,
      mimeType || "image/jpeg"
    );

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
