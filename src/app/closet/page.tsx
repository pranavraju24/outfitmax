import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/wardrobe/storage";
import type { Garment } from "@/lib/wardrobe/types";
import AddGarmentForm from "./AddGarmentForm";
import { deleteGarment } from "./actions";

export default async function ClosetPage() {
  const user = await requireUser();

  // Fetch THIS user's garments. We use the logged-in server client, so Row Level
  // Security automatically limits results to rows they own — no manual filtering.
  const supabase = await createClient();
  const { data } = await supabase
    .from("garments")
    .select("*")
    .order("created_at", { ascending: false });
  const garments = (data ?? []) as Garment[];

  // Turn each private storage path into a temporary displayable URL.
  const items = await Promise.all(
    garments.map(async (g) => ({ g, url: await getSignedUrl(g.storage_path) }))
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">My Closet</h1>
      <p className="mt-3 text-lg text-gray-500">
        Logged in as {user.email}. {garments.length} item
        {garments.length === 1 ? "" : "s"}.
      </p>

      <div className="mx-auto mt-8 max-w-xl">
        <AddGarmentForm />
      </div>

      {items.length === 0 ? (
        <p className="mt-10 text-lg text-gray-500">
          Your closet is empty. Add a clothing photo above to get started.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-4 text-left sm:grid-cols-3">
          {items.map(({ g, url }) => (
            <div
              key={g.id}
              className="overflow-hidden rounded-xl border border-[#2b2420]/15"
            >
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt={g.name ?? "Clothing item"}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-[#2b2420]/5 text-xs text-gray-400">
                  image unavailable
                </div>
              )}

              <div className="p-3">
                <p className="truncate text-sm font-medium">
                  {g.name ?? "Untitled"}
                </p>
                <p className="text-xs text-gray-500">
                  {[g.category, g.color].filter(Boolean).join(" · ")}
                </p>
                {g.tags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {g.tags.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        className="rounded bg-[#2b2420]/5 px-1.5 py-0.5 text-[10px] text-gray-600"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <form action={deleteGarment} className="mt-3">
                  <input type="hidden" name="id" value={g.id} />
                  <button className="text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
