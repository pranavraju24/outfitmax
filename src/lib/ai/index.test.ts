import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// getStylist() constructs a GeminiStylist, which builds the real Google client —
// so we mock that client here too.
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: () => {} };
  },
  Type: {
    OBJECT: "OBJECT",
    STRING: "STRING",
    ARRAY: "ARRAY",
    NUMBER: "NUMBER",
    BOOLEAN: "BOOLEAN",
  },
}));

import { getStylist } from "./index";

const ORIGINAL_KEY = process.env.GEMINI_API_KEY;

beforeEach(() => {
  delete process.env.GEMINI_API_KEY;
});
afterEach(() => {
  process.env.GEMINI_API_KEY = ORIGINAL_KEY;
});

describe("getStylist (provider factory)", () => {
  it("throws a clear error when GEMINI_API_KEY is missing", () => {
    expect(() => getStylist()).toThrow(/GEMINI_API_KEY/);
  });

  it("returns an object satisfying the AIStylist contract when configured", () => {
    process.env.GEMINI_API_KEY = "test-key";
    const stylist = getStylist();

    // The rest of the app depends only on these three methods — not on Gemini.
    expect(typeof stylist.analyzeOutfit).toBe("function");
    expect(typeof stylist.tagGarment).toBe("function");
    expect(typeof stylist.suggestOutfits).toBe("function");
  });
});
