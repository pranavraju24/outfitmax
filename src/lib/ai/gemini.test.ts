import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock the real Google Gemini client -------------------------------------
// vi.hoisted lets us create the mock function BEFORE vi.mock runs (vi.mock is
// hoisted to the top of the file). Every GeminiStylist we create will call this
// same fake generateContent, which each test controls.
const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  // A class, so `new GoogleGenAI(...)` works. Every instance shares our mock.
  GoogleGenAI: class {
    models = { generateContent: generateContentMock };
  },
  // The real SDK's Type enum is used when building response schemas at import
  // time, so the mock must provide the same keys.
  Type: {
    OBJECT: "OBJECT",
    STRING: "STRING",
    ARRAY: "ARRAY",
    NUMBER: "NUMBER",
    BOOLEAN: "BOOLEAN",
  },
}));

import { GeminiStylist } from "./gemini";

// A fake base64 image to pass around.
const IMG = { data: "ZmFrZQ==", mimeType: "image/png" };

// Helper: make the mocked Gemini "return" a given JSON object as its text.
function geminiReturns(obj: unknown) {
  generateContentMock.mockResolvedValue({ text: JSON.stringify(obj) });
}

const VALID_TAG = {
  name: "black cotton hoodie",
  category: "top",
  color: "black",
  pattern: "solid",
  material: "cotton",
  season: "all-season",
  description: "A cozy pullover hoodie.",
  tags: ["casual", "streetwear"],
};

beforeEach(() => {
  generateContentMock.mockReset();
});

describe("GeminiStylist.tagGarment", () => {
  it("parses valid JSON into a garment", async () => {
    geminiReturns(VALID_TAG);
    const stylist = new GeminiStylist("test-key");

    const result = await stylist.tagGarment(IMG);

    expect(result.name).toBe("black cotton hoodie");
    expect(result.category).toBe("top");
    expect(result.tags).toEqual(["casual", "streetwear"]);
  });

  it("defaults tags to an empty array when the model omits them", async () => {
    const { tags, ...withoutTags } = VALID_TAG;
    void tags;
    geminiReturns(withoutTags);
    const stylist = new GeminiStylist("test-key");

    const result = await stylist.tagGarment(IMG);
    expect(result.tags).toEqual([]);
  });

  it("rejects when the model returns malformed JSON", async () => {
    generateContentMock.mockResolvedValue({ text: "not json {{{" });
    const stylist = new GeminiStylist("test-key");

    await expect(stylist.tagGarment(IMG)).rejects.toThrow(/invalid JSON/i);
  });

  it("rejects when the model returns an empty response", async () => {
    generateContentMock.mockResolvedValue({ text: "" });
    const stylist = new GeminiStylist("test-key");

    await expect(stylist.tagGarment(IMG)).rejects.toThrow(/empty/i);
  });
});

describe("GeminiStylist retry / backoff", () => {
  it("retries a transient 503 error and then succeeds", async () => {
    generateContentMock
      .mockRejectedValueOnce(new Error("503 Service Unavailable"))
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_TAG) });
    const stylist = new GeminiStylist("test-key");

    const result = await stylist.tagGarment(IMG);

    expect(result.name).toBe("black cotton hoodie");
    expect(generateContentMock).toHaveBeenCalledTimes(2); // failed once, retried
  });

  it("does NOT retry a non-transient error (e.g. bad request)", async () => {
    generateContentMock.mockRejectedValue(new Error("400 invalid request"));
    const stylist = new GeminiStylist("test-key");

    await expect(stylist.tagGarment(IMG)).rejects.toThrow();
    expect(generateContentMock).toHaveBeenCalledTimes(1); // no retry
  });

  it("gives up with a friendly message after exhausting retries", async () => {
    generateContentMock.mockRejectedValue(new Error("the model is overloaded"));
    const stylist = new GeminiStylist("test-key");

    await expect(stylist.tagGarment(IMG)).rejects.toThrow(/busy/i);
    expect(generateContentMock).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });
});

describe("GeminiStylist.analyzeOutfit", () => {
  it("attaches shop links to each suggestion", async () => {
    geminiReturns({
      summary: "Clean, cohesive look.",
      rating: 8,
      whatWorks: ["neutral palette"],
      whatToImprove: ["add a belt"],
      suggestions: [
        { item: "brown leather belt", reason: "ties it together", searchQuery: "brown leather belt" },
      ],
    });
    const stylist = new GeminiStylist("test-key");

    const result = await stylist.analyzeOutfit({ images: [IMG] });

    expect(result.rating).toBe(8);
    expect(result.suggestions[0].shopLinks).toHaveLength(2);
    expect(result.suggestions[0].shopLinks[0].label).toBe("Google Shopping");
  });
});

describe("GeminiStylist.suggestOutfits", () => {
  const garments = [
    { name: "white tee", category: "top", color: "white", pattern: "solid", material: "cotton", season: "all-season", tags: [] },
    { name: "blue jeans", category: "bottom", color: "blue", pattern: "solid", material: "denim", season: "all-season", tags: [] },
  ];

  it("keeps only valid 1-based item indexes the AI references", async () => {
    geminiReturns([
      { title: "Everyday casual", rationale: "simple and clean", garmentIndexes: [1, 5, 2], missingPiece: null },
    ]);
    const stylist = new GeminiStylist("test-key");

    const result = await stylist.suggestOutfits({ garments });

    // Index 5 doesn't exist (only 2 garments) and is dropped.
    expect(result[0].garmentIndexes).toEqual([1, 2]);
  });

  it("defaults missingPiece to null when omitted", async () => {
    geminiReturns([{ title: "Casual", rationale: "ok", garmentIndexes: [1, 2] }]);
    const stylist = new GeminiStylist("test-key");

    const result = await stylist.suggestOutfits({ garments });
    expect(result[0].missingPiece).toBeNull();
  });
});

describe("GeminiStylist.detectGarment (live scan)", () => {
  it("parses a quick detection", async () => {
    geminiReturns({ present: true, name: "red hoodie", category: "top", color: "red" });
    const stylist = new GeminiStylist("test-key");

    const d = await stylist.detectGarment(IMG);
    expect(d.present).toBe(true);
    expect(d.name).toBe("red hoodie");
    expect(d.category).toBe("top");
  });

  it("does NOT retry during scanning — fails fast on a transient error", async () => {
    generateContentMock.mockRejectedValue(new Error("503 overloaded"));
    const stylist = new GeminiStylist("test-key");

    await expect(stylist.detectGarment(IMG)).rejects.toThrow();
    expect(generateContentMock).toHaveBeenCalledTimes(1); // maxAttempts = 1
  });
});

describe("GeminiStylist.parseGarments (multi-item photo)", () => {
  it("returns one entry per item and defaults missing tags", async () => {
    geminiReturns([
      { name: "white tee", category: "top", color: "white", pattern: "solid", material: "cotton", season: "all-season", description: "x" },
      { name: "blue jeans", category: "bottom", color: "blue", pattern: "solid", material: "denim", season: "all-season", description: "y", tags: ["casual"] },
    ]);
    const stylist = new GeminiStylist("test-key");

    const items = await stylist.parseGarments(IMG);
    expect(items).toHaveLength(2);
    expect(items[0].tags).toEqual([]); // defaulted
    expect(items[1].name).toBe("blue jeans");
  });
});
