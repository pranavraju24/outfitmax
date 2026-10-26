// Parses ONE uploaded photo that may contain several garments into a list of
// items. Used by the "Upload photo" scan mode.
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth/dal";
import { getStylist } from "@/lib/ai";

export const maxDuration = 30;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const image = body?.image;
    const mimeType =
      typeof body?.mimeType === "string" ? body.mimeType : "image/jpeg";

    if (typeof image !== "string" || image.length === 0) {
      return NextResponse.json({ error: "No image provided." }, { status: 400 });
    }

    const items = await getStylist().parseGarments({ data: image, mimeType });
    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not parse the photo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
