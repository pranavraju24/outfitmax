// ============================================================================
// The single "front door" to our AI layer.
//
// The rest of the app calls `getStylist()` and gets back something that satisfies
// the AIStylist contract — without knowing or caring that it's Gemini underneath.
// To switch providers later, you'd only change this one function.
// ============================================================================

import type { AIStylist } from "./types";
import { GeminiStylist } from "./gemini";

export function getStylist(): AIStylist {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // A clear, friendly error so future-you knows exactly what's wrong.
    throw new Error(
      "GEMINI_API_KEY is missing. Add it to .env.local (get a key at https://aistudio.google.com/apikey) and restart the dev server."
    );
  }

  return new GeminiStylist(apiKey);
}

// Re-export the types so pages/components can import everything from "@/lib/ai".
export * from "./types";
