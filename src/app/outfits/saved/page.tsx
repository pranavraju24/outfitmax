import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/wardrobe/storage";
import type { Garment } from "@/lib/wardrobe/types";
import { deleteSavedOutfit } from "../actions";

interface SavedOutfit {
  id: string;
  title: string | null;
  rationale: string | null;
  garment_ids: string[];
  created_at: string;
}

export default async function SavedOutfitsPage() {
  await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("saved_outfits")
    .select("*")
    .order("created_at", { ascending: false });
  const outfits = (data ?? []) as SavedOutfit[];

  // Resolve every referenced garment once, into an id → {garment, signed url} map.
  const allIds = Array.from(new Set(outfits.flatMap((o) => o.garment_ids ?? [])));
  const garmentMap = new Map<string, { g: Garment; url: string | null }>();
  if (allIds.length) {
    const { data: gData } = await supabase
      .from("garments")
      .select("*")
      .in("id", allIds);
    await Promise.all(
      ((gData ?? []) as Garment[]).map(async (g) => {
        garmentMap.set(g.id, { g, url: await getSignedUrl(g.storage_path) });
      })
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Saved outfits
      </h1>
      <p className="mt-3 text-lg text-gray-500">
        {outfits.length} saved.
      </p>
      <p className="mt-2">
        <Link href="/outfits" className="text-sm text-[#E86A45] hover:underline">
          ← Back to suggestions
        </Link>
      </p>

      {outfits.length === 0 ? (
        <p className="mt-10 text-gray-500">
          No saved outfits yet — save some from the{" "}
          <Link href="/outfits" className="underline">
            suggestions
          </Link>
          .
        </p>
      ) : (
        <div className="mt-8 space-y-6 text-left">
          {outfits.map((o) => (
            <div key={o.id} className="rounded-xl border border-[#2b2420]/15 p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold">{o.title ?? "Outfit"}</h2>
                <form action={deleteSavedOutfit}>
                  <input type="hidden" name="id" value={o.id} />
                  <button className="shrink-0 text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                </form>
              </div>

              <div className="mt-3 flex flex-wrap gap-3">
                {(o.garment_ids ?? []).map((gid) => {
                  const item = garmentMap.get(gid);
                  if (!item) return null;
                  return (
                    <div key={gid} className="w-24">
                      {item.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt={item.g.name ?? "item"}
                          className="h-24 w-24 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-[#2b2420]/5 text-[10px] text-gray-400">
                          no image
                        </div>
                      )}
                      <p className="mt-1 truncate text-[11px] text-gray-600">
                        {item.g.name ?? ""}
                      </p>
                    </div>
                  );
                })}
              </div>

              {o.rationale && (
                <p className="mt-3 text-sm text-gray-700">{o.rationale}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
