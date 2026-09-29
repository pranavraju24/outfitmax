// ============================================================================
// THE BACKEND ENDPOINT.  URL: /api/analyze
//
// In Next.js App Router, a file named `route.ts` inside `src/app/...` becomes a
// backend URL (not a page). Because this code runs on the SERVER, it can safely
// read the secret GEMINI_API_KEY — the browser never sees it.
//
// The browser will send a POST request here with the photos + question, and we
// reply with the styling feedback as JSON.
// ============================================================================

import { NextResponse } from "next/server";
import { getStylist } from "@/lib/ai";

// This route talks to an external API, so give it a little more time than the
// default before Next.js gives up.
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    // Read the JSON the browser sent us.
    const body = await request.json();
    const images = body?.images;
    const question = typeof body?.question === "string" ? body.question : undefined;

    // Basic validation so we fail with a friendly message instead of a crash.
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "Please upload at least one clothing photo." },
        { status: 400 }
      );
    }

    // Get our (Gemini-backed) stylist and ask for feedback.
    const stylist = getStylist();
    const feedback = await stylist.analyzeOutfit({ images, question });

    // Send the result back to the browser.
    return NextResponse.json(feedback);
  } catch (err) {
    // Any error (missing key, bad image, Gemini hiccup) lands here.
    const message =
      err instanceof Error ? err.message : "Something went wrong. Please try again.";
    console.error("[/api/analyze] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
