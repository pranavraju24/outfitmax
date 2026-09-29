"use server";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/wardrobe/storage";
import { getStylist } from "@/lib/ai";
import { buildShopLinks } from "@/lib/ai/shop";
import type { ShopLink } from "@/lib/ai/types";
import type { Garment } from "@/lib/wardrobe/types";

// One piece of a suggested outfit, resolved to a real garment + display image.
export interface OutfitPiece {
  id: string;
  name: string;
  category: string;
  url: string | null;
}

export interface ResolvedOutfit {
  title: string;
  rationale: string;
  missingPiece: string | null;
  missingPieceLinks: ShopLink[];
  pieces: OutfitPiece[];
}

export type SuggestState =
  | { error?: string; outfits?: ResolvedOutfit[] }
  | undefined;

export async function suggestOutfits(
  _prev: SuggestState,
  formData: FormData
): Promise<SuggestState> {
  await requireUser();
  const occasion = String(formData.get("occasion") ?? "").trim();

  // Read the user's wardrobe (RLS scopes this to them automatically).
  const supabase = await createClient();
  const { data } = await supabase
    .from("garments")
    .select("*")
    .order("created_at", { ascending: false });
  const garments = (data ?? []) as Garment[];

  if (garments.length < 2) {
    return {
      error:
        "Add at least 2 items to your closet first, then I can suggest outfits.",
    };
  }

  // Ask the AI using just the text catalog (no images sent).
  let ideas;
  try {
    ideas = await getStylist().suggestOutfits({
      occasion: occasion || undefined,
      garments: garments.map((g) => ({
        name: g.name ?? "item",
        category: g.category ?? "unknown",
        color: g.color ?? "unknown",
        pattern: g.pattern ?? "unknown",
        material: g.material ?? "unknown",
        season: g.season ?? "unknown",
        tags: g.tags ?? [],
      })),
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not generate outfits.",
    };
  }

  // Turn each idea's item-numbers back into real garments with signed images.
  const outfits: ResolvedOutfit[] = await Promise.all(
    ideas.map(async (idea) => {
      const pieces = await Promise.all(
        idea.garmentIndexes.map(async (n) => {
          const g = garments[n - 1]; // n is 1-based
          return {
            id: g.id,
            name: g.name ?? "item",
            category: g.category ?? "",
            url: await getSignedUrl(g.storage_path),
          };
        })
      );
      return {
        title: idea.title,
        rationale: idea.rationale,
        missingPiece: idea.missingPiece,
        missingPieceLinks: idea.missingPiece
          ? buildShopLinks(idea.missingPiece)
          : [],
        pieces,
      };
    })
  );

  // Drop any outfit that somehow ended up empty.
  return { outfits: outfits.filter((o) => o.pieces.length > 0) };
}
