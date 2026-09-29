import Link from "next/link";
import ClothingMarquee, { TILES } from "@/app/_components/ClothingMarquee";
import { getUser } from "@/lib/auth/dal";

// The three existing features, introduced as you scroll.
const FEATURES = [
  {
    emoji: "✨",
    bg: "#E86A45",
    title: "Instant styling feedback",
    desc: "Upload a photo of what you're wearing and get an honest rating, what works, what to tweak, and pieces that would level it up — each with links to shop them.",
    href: "/analyze",
    cta: "Try it now — no login",
  },
  {
    emoji: "👚",
    bg: "#3CB98C",
    title: "Your digital wardrobe",
    desc: "Snap your clothes and OutfitMax auto-tags every piece — category, color, material, and vibe — into a private closet that only you can see.",
    href: "/closet",
    cta: "Build your closet",
  },
  {
    emoji: "🪄",
    bg: "#9B5DE5",
    title: "Outfit ideas from your closet",
    desc: "Tell it the occasion and get complete outfits assembled only from the clothes you already own — styled, explained, and ready to wear.",
    href: "/outfits",
    cta: "Get outfit ideas",
  },
];

export default async function LandingPage() {
  const user = await getUser();

  return (
    <div>
      {/* ------------------------------------------------------------------ */}
      {/* HERO                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden">
        {/* Top moving row of clothing tiles */}
        <div className="pt-8">
          <ClothingMarquee direction="left" />
        </div>

        <div className="mx-auto max-w-3xl px-4 py-10 text-center">
          <h1 className="text-6xl font-black tracking-tight sm:text-7xl">
            Outfit<span className="text-[#E86A45]">Max</span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-lg text-[#5c5148]">
            Dress better with a little help from AI. Get feedback on your fits,
            catalog your wardrobe, and discover new outfits from clothes you
            already own.
          </p>

          {/* Primary actions, right below the title */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Link
                href="/closet"
                className="rounded-full bg-[#E86A45] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d65b38]"
              >
                Go to my closet
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-[#E86A45] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d65b38]"
              >
                Log in
              </Link>
            )}
            <Link
              href="/analyze"
              className="rounded-full border border-[#2b2420]/15 bg-white px-6 py-3 text-sm font-semibold text-[#2b2420] transition hover:bg-[#2b2420]/5"
            >
              Analyze an outfit{user ? "" : " — no login"} →
            </Link>
          </div>
        </div>

        {/* Bottom moving row (opposite direction, different order) */}
        <div className="pb-8">
          <ClothingMarquee direction="right" tiles={[...TILES].reverse()} />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FEATURES                                                            */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-t border-[#2b2420]/10 bg-[#f5e9d2]/60">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold">
            Everything OutfitMax can do
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-[#5c5148]">
            Three tools that work together to make getting dressed easier.
          </p>

          <div className="mt-12 space-y-10">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`flex flex-col items-center gap-6 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5 sm:flex-row ${
                  i % 2 === 1 ? "sm:flex-row-reverse" : ""
                }`}
              >
                <div
                  style={{ backgroundColor: f.bg }}
                  className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl text-5xl shadow-inner"
                >
                  <span role="img" aria-label={f.title}>
                    {f.emoji}
                  </span>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-xl font-bold">{f.title}</h3>
                  <p className="mt-2 text-[#5c5148]">{f.desc}</p>
                  <Link
                    href={f.href}
                    className="mt-4 inline-block text-sm font-semibold text-[#E86A45] hover:underline"
                  >
                    {f.cta} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CLOSING CALL-TO-ACTION                                              */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-t border-[#2b2420]/10">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h2 className="text-3xl font-bold">Ready to level up your style?</h2>
          <p className="mt-2 text-[#5c5148]">
            {user
              ? "Jump back into your wardrobe, or analyze a new outfit."
              : "Create a free account to start building your wardrobe, or try the analyzer first — no sign-up needed."}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Link
                href="/closet"
                className="rounded-full bg-[#E86A45] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d65b38]"
              >
                Go to my closet
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-[#E86A45] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d65b38]"
              >
                Get started free
              </Link>
            )}
            <Link
              href="/analyze"
              className="rounded-full border border-[#2b2420]/15 bg-white px-6 py-3 text-sm font-semibold text-[#2b2420] transition hover:bg-[#2b2420]/5"
            >
              Analyze an outfit
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#2b2420]/10 py-6 text-center text-xs text-[#5c5148]">
        OutfitMax · your AI personal stylist
      </footer>
    </div>
  );
}
