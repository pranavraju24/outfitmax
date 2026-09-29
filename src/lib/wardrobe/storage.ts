import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// All garment images live in this private Storage bucket. Because it's private,
// nobody can view an image by guessing its URL — we hand out temporary "signed
// URLs" (below) only to the logged-in owner.
const BUCKET = "garments";

// Uploads raw image bytes for a user and returns the storage path we save in
// the database. We namespace by user id (`<userId>/<random>.<ext>`) so each
// person's files are neatly separated.
export async function uploadGarmentImage(
  userId: string,
  bytes: ArrayBuffer,
  contentType: string
): Promise<string> {
  const supabase = createAdminClient();

  const ext = (contentType.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }
  return path;
}

// Creates a temporary URL (default: valid 1 hour) that lets the browser display
// a private image. We generate these on the server when rendering the closet.
export async function getSignedUrl(
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) return null;
  return data.signedUrl;
}
