// ============================================================================
// The Gemini implementation of our AIStylist contract.
//
// This is the ONLY file that knows we're using Google Gemini. If we ever add
// another provider (e.g. Claude), we'd add a sibling file like `claude.ts` and
// the rest of the app wouldn't change at all.
// ============================================================================

import { GoogleGenAI, Type } from "@google/genai";
import type {
  AIStylist,
  AnalyzeInput,
  GarmentTags,
  ImageInput,
  OutfitFeedback,
  OutfitIdea,
  SuggestOutfitsInput,
} from "./types";
import { buildShopLinks } from "./shop";

// The model we use. "flash" = fast + free-tier friendly, and it can see images.
// (Google retired gemini-2.5-flash for new accounts; 3.6-flash is the current one.)
const MODEL = "gemini-3.6-flash";

// The instructions we give the AI before it looks at the photos. Tweaking this
// text ("prompt engineering") is how we shape the personality and usefulness of
// the feedback.
const SYSTEM_PROMPT = `You are OutfitMax, an expert but friendly personal fashion stylist.
The user has uploaded one or more photos of clothing items (or an outfit).
Analyze what you see and give practical, encouraging styling feedback.

Guidelines:
- Be specific and reference the actual colors, patterns, and item types you see.
- If the user asked a question, answer it directly.
- When MULTIPLE pieces are shown, explain how they work together as an outfit, and
  suggest ways to LAYER or combine them (e.g. "layer the flannel open over the tee",
  "tuck the tee and add the jacket on cooler days"). Call out which pieces pair well
  and which clash.
- "rating" is your overall score from 1-10 for how well the pieces work together;
  use null only if you truly cannot judge (e.g. a single item shown alone).
- In "suggestions", recommend real, buyable item types (not brand names) that would
  complete or upgrade the look. "searchQuery" should be a short shopping phrase a
  person could type into a store search, e.g. "slim dark wash jeans".
- Keep list items short (one sentence each).`;

// The exact JSON structure we force Gemini to return. Providing a schema like
// this makes the output reliable and easy to parse (no guessing).
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    rating: { type: Type.NUMBER, nullable: true },
    whatWorks: { type: Type.ARRAY, items: { type: Type.STRING } },
    whatToImprove: { type: Type.ARRAY, items: { type: Type.STRING } },
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          item: { type: Type.STRING },
          reason: { type: Type.STRING },
          searchQuery: { type: Type.STRING },
        },
        required: ["item", "reason", "searchQuery"],
      },
    },
  },
  required: ["summary", "whatWorks", "whatToImprove", "suggestions"],
};

// The plain shape Gemini returns (before we add shop links ourselves).
interface RawFeedback {
  summary: string;
  rating: number | null;
  whatWorks: string[];
  whatToImprove: string[];
  suggestions: { item: string; reason: string; searchQuery: string }[];
}

// --- Single-garment tagging (used by the wardrobe) ---------------------------

const TAG_PROMPT = `You are a fashion cataloguer. You are shown a photo of a single clothing item
being added to a wardrobe. Identify it and fill in the fields precisely and concisely.
- If the photo happens to show more than one item, describe the single most prominent one.
- "category" MUST be exactly one of: top, bottom, shoes, outerwear, accessory, other.
- "name" is a short label like "black cotton hoodie".
- "season" is like "all-season", "summer", "winter", "spring/fall".
- "tags" are 2-5 short lowercase keywords (e.g. "casual", "streetwear", "formal").
If something isn't determinable from the photo, use "unknown" (or [] for tags).`;

const TAG_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    category: { type: Type.STRING },
    color: { type: Type.STRING },
    pattern: { type: Type.STRING },
    material: { type: Type.STRING },
    season: { type: Type.STRING },
    description: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    "name",
    "category",
    "color",
    "pattern",
    "material",
    "season",
    "description",
    "tags",
  ],
};

// --- Outfit suggestions from the user's wardrobe -----------------------------

const OUTFITS_PROMPT = `You are OutfitMax, a personal stylist. You are given a numbered list of clothing
items the user already OWNS. Assemble 2-4 complete, wearable outfits using ONLY
those items, referencing each piece by its number.

Rules:
- Use ONLY the item numbers provided. Never invent items.
- A good outfit usually covers a top, a bottom, and shoes when available; add
  outerwear/accessories to layer when it makes sense.
- Consider color harmony, season, and the occasion (if given).
- "garmentIndexes" lists the item numbers in each outfit.
- In "rationale", say briefly why it works and how to wear/layer it.
- "missingPiece" is an optional single item the user could BUY to complete the
  look (a generic type like "white sneakers"), or null if nothing is needed.`;

const OUTFITS_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      rationale: { type: Type.STRING },
      garmentIndexes: { type: Type.ARRAY, items: { type: Type.NUMBER } },
      missingPiece: { type: Type.STRING, nullable: true },
    },
    required: ["title", "rationale", "garmentIndexes"],
  },
};

// A tiny pause helper. `await sleep(500)` waits half a second.
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Is this error the temporary kind that's worth retrying? Google returns 503
// (UNAVAILABLE / overloaded) or 429 (RESOURCE_EXHAUSTED / rate limited) when it's
// just busy — those usually succeed on a second try. Real mistakes (bad key, bad
// request) are NOT retried, since retrying wouldn't help.
function isTransientError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("503") ||
    msg.includes("unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("high demand") ||
    msg.includes("429") ||
    msg.includes("resource_exhausted")
  );
}

export class GeminiStylist implements AIStylist {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    // This object is our connection to Google's servers.
    this.ai = new GoogleGenAI({ apiKey });
  }

  // Calls Gemini, but automatically retries a few times if the server is just
  // temporarily busy. Uses "exponential backoff": wait a bit, then wait twice
  // as long, etc., so we don't hammer an already-overloaded server.
  private async generateWithRetry(
    request: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
    maxAttempts = 3
  ): Promise<Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.ai.models.generateContent(request);
      } catch (err) {
        lastErr = err;
        // Not a temporary error, or we're out of tries → stop looping.
        if (!isTransientError(err) || attempt === maxAttempts) break;
        // Wait longer each round: ~0.7s, then ~1.4s, before trying again.
        await sleep(700 * 2 ** (attempt - 1));
      }
    }
    // We exhausted our attempts. Give a friendly, actionable message for the
    // "busy" case; otherwise re-throw the original error.
    if (isTransientError(lastErr)) {
      throw new Error(
        "Gemini is busy right now (high demand). Please wait a few seconds and try again."
      );
    }
    throw lastErr;
  }

  async analyzeOutfit(input: AnalyzeInput): Promise<OutfitFeedback> {
    const { images, question } = input;

    // Build the message we send: the text prompt first, then each image.
    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [
      {
        text: question?.trim()
          ? `The user asks: "${question.trim()}"\n\nHere ${
              images.length > 1 ? "are the items" : "is the item"
            }:`
          : `Give your styling feedback on the following ${
              images.length > 1 ? "items" : "item"
            }:`,
      },
      ...images.map((img) => ({
        inlineData: { mimeType: img.mimeType, data: img.data },
      })),
    ];

    // Actually call Gemini — but through our retry wrapper so a temporary
    // "server busy" blip doesn't bubble up to the user as a hard failure.
    const response = await this.generateWithRetry({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    // `response.text` is the model's answer as a JSON string; parse it to an object.
    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    let raw: RawFeedback;
    try {
      raw = JSON.parse(text) as RawFeedback;
    } catch {
      throw new Error("Gemini returned invalid JSON.");
    }

    // Attach shop links to each suggestion (this is our own code, not the AI's).
    return {
      summary: raw.summary,
      rating: raw.rating ?? null,
      whatWorks: raw.whatWorks ?? [],
      whatToImprove: raw.whatToImprove ?? [],
      suggestions: (raw.suggestions ?? []).map((s) => ({
        item: s.item,
        reason: s.reason,
        searchQuery: s.searchQuery,
        shopLinks: buildShopLinks(s.searchQuery),
      })),
    };
  }

  async tagGarment(image: ImageInput): Promise<GarmentTags> {
    const response = await this.generateWithRetry({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: "Catalogue this clothing item:" },
            { inlineData: { mimeType: image.mimeType, data: image.data } },
          ],
        },
      ],
      config: {
        systemInstruction: TAG_PROMPT,
        responseMimeType: "application/json",
        responseSchema: TAG_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    try {
      const raw = JSON.parse(text) as GarmentTags;
      // Make sure tags is always an array, even if the model omitted it.
      return { ...raw, tags: raw.tags ?? [] };
    } catch {
      throw new Error("Gemini returned invalid JSON while tagging the garment.");
    }
  }

  async suggestOutfits(input: SuggestOutfitsInput): Promise<OutfitIdea[]> {
    const { garments, occasion } = input;

    // Build the numbered catalog the prompt refers to (1-based numbering).
    const catalog = garments
      .map((g, i) => {
        const bits = [g.category, g.color, g.pattern, g.material, g.season]
          .filter((b) => b && b !== "unknown")
          .join(", ");
        const tags = g.tags?.length ? ` [${g.tags.join(", ")}]` : "";
        return `${i + 1}. ${g.name}${bits ? ` (${bits})` : ""}${tags}`;
      })
      .join("\n");

    const promptText = `Wardrobe items:\n${catalog}\n\n${
      occasion?.trim() ? `Occasion/context: ${occasion.trim()}` : "No specific occasion."
    }`;

    const response = await this.generateWithRetry({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      config: {
        systemInstruction: OUTFITS_PROMPT,
        responseMimeType: "application/json",
        responseSchema: OUTFITS_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    let raw: OutfitIdea[];
    try {
      raw = JSON.parse(text) as OutfitIdea[];
    } catch {
      throw new Error("Gemini returned invalid JSON while suggesting outfits.");
    }

    // Keep only valid item numbers (1..N) so a stray index can't crash the UI.
    return (raw ?? []).map((o) => ({
      title: o.title,
      rationale: o.rationale,
      missingPiece: o.missingPiece ?? null,
      garmentIndexes: (o.garmentIndexes ?? []).filter(
        (n) => Number.isInteger(n) && n >= 1 && n <= garments.length
      ),
    }));
  }
}
