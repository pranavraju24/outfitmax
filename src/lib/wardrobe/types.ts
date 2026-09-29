// The shape of one clothing item, matching the `garments` table columns
// exactly (see supabase/schema.sql). Supabase returns rows with these
// snake_case names, so we use the same names here to avoid any translation.

export interface Garment {
  id: string;
  user_id: string;
  created_at: string;

  storage_path: string;
  image_url: string | null;

  name: string | null;
  category: string | null;
  color: string | null;
  pattern: string | null;
  material: string | null;
  season: string | null;
  description: string | null;
  tags: string[];
}

// The handful of categories we sort clothes into. `string` is still allowed on
// the DB side, but this list is what our UI and AI will aim for.
export const GARMENT_CATEGORIES = [
  "top",
  "bottom",
  "shoes",
  "outerwear",
  "accessory",
  "other",
] as const;

export type GarmentCategory = (typeof GARMENT_CATEGORIES)[number];
