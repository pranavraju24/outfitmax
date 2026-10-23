import { describe, it, expect } from "vitest";
import { buildShopLinks } from "./shop";

describe("buildShopLinks", () => {
  it("returns a Google Shopping and an Amazon link", () => {
    const links = buildShopLinks("white sneakers");
    expect(links).toHaveLength(2);
    expect(links.map((l) => l.label)).toEqual(["Google Shopping", "Amazon"]);
  });

  it("URL-encodes the search phrase (spaces become %20)", () => {
    const [google, amazon] = buildShopLinks("slim dark wash jeans");
    expect(google.url).toContain("slim%20dark%20wash%20jeans");
    expect(amazon.url).toContain("slim%20dark%20wash%20jeans");
  });

  it("escapes characters that would break the query", () => {
    const [google] = buildShopLinks("jeans & tops");
    // Look only at the query value (after "q="), not the URL's own separators.
    const query = google.url.split("q=")[1];
    expect(query).not.toContain(" "); // spaces encoded...
    expect(query).toContain("%20"); // ...as %20
    expect(query).toContain("%26"); // the "&" is encoded, not literal
  });
});
