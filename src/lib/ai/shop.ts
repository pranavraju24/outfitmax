// ============================================================================
// Turns a plain search phrase (e.g. "white low-top sneakers") into clickable
// store-search links. We generate these ourselves in code rather than asking
// the AI, so the URLs are always valid and predictable.
// ============================================================================

import type { ShopLink } from "./types";

export function buildShopLinks(searchQuery: string): ShopLink[] {
  // encodeURIComponent makes the phrase safe to drop into a URL
  // (turns spaces into %20, etc.).
  const q = encodeURIComponent(searchQuery);

  return [
    {
      label: "Google Shopping",
      url: `https://www.google.com/search?tbm=shop&q=${q}`,
    },
    {
      label: "Amazon",
      url: `https://www.amazon.com/s?k=${q}`,
    },
  ];
}
