// ============================================================================
// The "shape" of our AI styling layer.
//
// This file contains NO logic — just TypeScript "types" (descriptions of what
// data looks like) and one "interface" (a contract). Defining these separately
// is what lets us swap AI providers later: any provider just has to satisfy the
// `AIStylist` contract below, and the rest of the app stays untouched.
// ============================================================================

/** One uploaded image, encoded as text so it can be sent over the network. */
export interface ImageInput {
  /** The image bytes encoded as a base64 string. */
  data: string;
  /** e.g. "image/jpeg" or "image/png" — tells the AI how to read the bytes. */
  mimeType: string;
}

/** A clickable link that sends the user to a store search for a suggested item. */
export interface ShopLink {
  /** What the button says, e.g. "Google Shopping". */
  label: string;
  /** The URL to open. */
  url: string;
}

/** A single item the AI thinks the user should add to complete/improve the look. */
export interface Suggestion {
  /** The item to add, e.g. "white leather low-top sneakers". */
  item: string;
  /** Why it pairs well with what the user uploaded. */
  reason: string;
  /** A short phrase we feed into store searches to build `shopLinks`. */
  searchQuery: string;
  /** Ready-to-click store links (we build these in code, not the AI). */
  shopLinks: ShopLink[];
}

/** The full styling verdict we show the user. */
export interface OutfitFeedback {
  /** A one-or-two sentence overall take on the outfit. */
  summary: string;
  /** Optional score out of 10. */
  rating: number | null;
  /** Things that already work about the outfit. */
  whatWorks: string[];
  /** Concrete tweaks that would improve it. */
  whatToImprove: string[];
  /** Items to consider adding, each with shop links. */
  suggestions: Suggestion[];
}

/** What the caller passes in to get feedback. */
export interface AnalyzeInput {
  /** One or more clothing photos. */
  images: ImageInput[];
  /** Optional user question, e.g. "is this good for a first date?" */
  question?: string;
}

/** Structured attributes describing ONE clothing item, extracted by the AI. */
export interface GarmentTags {
  /** Short human label, e.g. "black cotton hoodie". */
  name: string;
  /** One of: top / bottom / shoes / outerwear / accessory / other. */
  category: string;
  color: string;
  pattern: string;
  material: string;
  /** e.g. "all-season", "summer", "winter". */
  season: string;
  description: string;
  /** A few freeform keywords, e.g. ["casual", "streetwear"]. */
  tags: string[];
}

/** A wardrobe item as described to the AI (text only — no image needed). */
export interface WardrobeItem {
  name: string;
  category: string;
  color: string;
  pattern: string;
  material: string;
  season: string;
  tags: string[];
}

/** One outfit the AI assembled from the user's wardrobe. */
export interface OutfitIdea {
  /** A short catchy name, e.g. "Casual weekend layers". */
  title: string;
  /** Why these pieces work together (and how to wear/layer them). */
  rationale: string;
  /**
   * Which wardrobe items make up this outfit, given as 1-based positions in the
   * `garments` array that was passed in. We reference by number so the AI can't
   * invent items that aren't in the closet.
   */
  garmentIndexes: number[];
  /** Optional single item the user could buy to complete/upgrade the look. */
  missingPiece: string | null;
}

export interface SuggestOutfitsInput {
  garments: WardrobeItem[];
  /** Optional context, e.g. "job interview", "cold rainy day". */
  occasion?: string;
}

/**
 * THE CONTRACT. Any AI provider we use (Gemini today, maybe Claude later) must
 * provide a class with these methods. The app only ever talks to this
 * interface, so switching providers means writing one new class — nothing else.
 */
export interface AIStylist {
  /** Critique an outfit made of one or more photos. */
  analyzeOutfit(input: AnalyzeInput): Promise<OutfitFeedback>;
  /** Look at ONE clothing photo and describe/categorize it for the wardrobe. */
  tagGarment(image: ImageInput): Promise<GarmentTags>;
  /** Assemble outfits from the user's existing wardrobe (text catalog). */
  suggestOutfits(input: SuggestOutfitsInput): Promise<OutfitIdea[]>;
}
