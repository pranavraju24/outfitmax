// Detection endpoint for the live camera scanner.
// The browser POSTs a single captured frame (base64), and we return Gemini's
// garment tags for it. One call per frame — the client controls the rate.
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth/dal";
import { getStylist } from "@/lib/ai";

export const maxDuration = 30;

export async function POST(request: Request) {
  // This adds to the user's wardrobe, so it requires a logged-in user.
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
      return NextResponse.json(
        { error: "No image frame provided." },
        { status: 400 }
      );
    }

    const tags = await getStylist().tagGarment({ data: image, mimeType });
    return NextResponse.json({ tags });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Detection failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
