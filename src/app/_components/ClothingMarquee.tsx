// A decorative, endlessly-scrolling row of colorful clothing tiles.
// Purely visual (a server component — no interactivity). The tiles use emoji so
// they render reliably everywhere; swap in real photos later if you like.

interface Tile {
  emoji: string;
  label: string;
  bg: string;
}

export const TILES: Tile[] = [
  { emoji: "👕", label: "T-shirt", bg: "#FF8A5B" },
  { emoji: "👖", label: "Jeans", bg: "#4EA8DE" },
  { emoji: "👗", label: "Dress", bg: "#F25C9A" },
  { emoji: "👟", label: "Sneakers", bg: "#3CB98C" },
  { emoji: "🧥", label: "Coat", bg: "#C08457" },
  { emoji: "🧢", label: "Cap", bg: "#F2B441" },
  { emoji: "👜", label: "Bag", bg: "#9B5DE5" },
  { emoji: "👔", label: "Shirt", bg: "#5AA9E6" },
  { emoji: "🧣", label: "Scarf", bg: "#E86A45" },
  { emoji: "👞", label: "Loafers", bg: "#8D6748" },
  { emoji: "🥾", label: "Boots", bg: "#A0863B" },
  { emoji: "👒", label: "Sun hat", bg: "#EFA6C9" },
  { emoji: "🩳", label: "Shorts", bg: "#57C4AD" },
  { emoji: "🕶️", label: "Shades", bg: "#3A3630" },
];

export default function ClothingMarquee({
  direction = "left",
  tiles = TILES,
}: {
  direction?: "left" | "right";
  tiles?: Tile[];
}) {
  const anim =
    direction === "left" ? "animate-marquee-left" : "animate-marquee-right";

  // Render the tiles twice so the loop is seamless.
  const doubled = [...tiles, ...tiles];

  return (
    <div className="relative overflow-hidden py-3 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className={`marquee-track flex w-max ${anim}`}>
        {doubled.map((t, i) => (
          <div
            key={i}
            className="mr-4 shrink-0"
            style={{ transform: `rotate(${i % 2 === 0 ? -4 : 4}deg)` }}
          >
            <div
              style={{ backgroundColor: t.bg }}
              className="flex h-20 w-20 items-center justify-center rounded-2xl shadow-sm ring-1 ring-black/5"
            >
              <span className="text-3xl" role="img" aria-label={t.label}>
                {t.emoji}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
