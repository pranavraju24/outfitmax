"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GARMENT_CATEGORIES, type Garment } from "@/lib/wardrobe/types";
import { deleteGarment, updateGarment } from "./actions";

type Item = { g: Garment; url: string | null };

export default function ClosetBrowser({ items }: { items: Item[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Client-side search + filter over the already-loaded closet.
  const q = query.trim().toLowerCase();
  const filtered = items.filter(({ g }) => {
    if (category !== "all" && (g.category ?? "") !== category) return false;
    if (!q) return true;
    const haystack = [
      g.name,
      g.category,
      g.color,
      g.pattern,
      g.material,
      g.season,
      ...(g.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateGarment(formData);
      router.refresh(); // pull fresh server data
      setEditingId(null);
    });
  }

  return (
    <div className="mt-10">
      {/* Search + filter controls */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your closet…"
          className="w-full max-w-xs rounded-xl border border-[#2b2420]/25 p-3 text-sm outline-none focus:border-[#E86A45]"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-[#2b2420]/25 p-3 text-sm outline-none focus:border-[#E86A45]"
        >
          <option value="all">All categories</option>
          {GARMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-3 text-sm text-gray-500">
        Showing {filtered.length} of {items.length}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-10 text-gray-500">No items match your search.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 text-left sm:grid-cols-3">
          {filtered.map(({ g, url }) => (
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
                {editingId === g.id ? (
                  // --- Edit mode ---
                  <form onSubmit={handleEditSubmit} className="space-y-2">
                    <input type="hidden" name="id" value={g.id} />
                    <input
                      name="name"
                      defaultValue={g.name ?? ""}
                      placeholder="Name"
                      className="w-full rounded border border-[#2b2420]/25 p-1.5 text-xs outline-none focus:border-[#E86A45]"
                    />
                    <select
                      name="category"
                      defaultValue={g.category ?? "other"}
                      className="w-full rounded border border-[#2b2420]/25 p-1.5 text-xs outline-none focus:border-[#E86A45]"
                    >
                      {GARMENT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <input
                      name="color"
                      defaultValue={g.color ?? ""}
                      placeholder="Color"
                      className="w-full rounded border border-[#2b2420]/25 p-1.5 text-xs outline-none focus:border-[#E86A45]"
                    />
                    <input
                      name="tags"
                      defaultValue={(g.tags ?? []).join(", ")}
                      placeholder="tags, comma, separated"
                      className="w-full rounded border border-[#2b2420]/25 p-1.5 text-xs outline-none focus:border-[#E86A45]"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isPending}
                        className="rounded bg-black px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {isPending ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded border border-[#2b2420]/25 px-2 py-1 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  // --- Display mode ---
                  <>
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
                    <div className="mt-3 flex gap-3">
                      <button
                        onClick={() => setEditingId(g.id)}
                        className="text-xs text-[#E86A45] hover:underline"
                      >
                        Edit
                      </button>
                      <form action={deleteGarment}>
                        <input type="hidden" name="id" value={g.id} />
                        <button className="text-xs text-red-600 hover:underline">
                          Remove
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
