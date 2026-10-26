"use client";

import { useActionState, useState } from "react";
import {
  suggestOutfits,
  saveOutfit,
  type SuggestState,
  type ResolvedOutfit,
} from "./actions";

export default function OutfitSuggester() {
  const [state, action, pending] = useActionState<SuggestState, FormData>(
    suggestOutfits,
    undefined
  );

  // Per-outfit save status (keyed by its index in the results list).
  const [savedState, setSavedState] = useState<
    Record<number, "idle" | "saving" | "saved" | "error">
  >({});

  async function handleSave(i: number, o: ResolvedOutfit) {
    setSavedState((s) => ({ ...s, [i]: "saving" }));
    const res = await saveOutfit({
      title: o.title,
      rationale: o.rationale,
      garmentIds: o.pieces.map((p) => p.id),
    });
    setSavedState((s) => ({ ...s, [i]: res.ok ? "saved" : "error" }));
  }

  return (
    <div>
      <form action={action} className="rounded-2xl border border-[#2b2420]/15 p-8">
        <label htmlFor="occasion" className="block text-base font-medium">
          Occasion or context (optional)
        </label>
        <div className="mt-3 flex flex-col gap-4">
          <input
            id="occasion"
            name="occasion"
            placeholder="e.g. dinner date, cold rainy day, job interview"
            className="w-full rounded-xl border border-[#2b2420]/25 p-4 text-base outline-none focus:border-[#E86A45]"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-black px-8 py-4 text-base font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Thinking…" : "Suggest outfits"}
          </button>
        </div>
      </form>

      {state?.error && <p className="mt-4 text-base text-red-600">{state.error}</p>}

      {state?.outfits && state.outfits.length > 0 && (
        <div className="mt-6 space-y-6 text-left">
          {state.outfits.map((o, i) => (
            <div key={i} className="rounded-xl border border-[#2b2420]/15 p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{o.title}</h3>
                {savedState[i] === "saved" ? (
                  <span className="shrink-0 text-xs text-green-700">Saved ✓</span>
                ) : (
                  <button
                    onClick={() => handleSave(i, o)}
                    disabled={savedState[i] === "saving"}
                    className="shrink-0 rounded-full border border-[#E86A45] px-3 py-1 text-xs font-medium text-[#E86A45] hover:bg-[#E86A45]/10 disabled:opacity-50"
                  >
                    {savedState[i] === "saving" ? "Saving…" : "♥ Save outfit"}
                  </button>
                )}
              </div>
              {savedState[i] === "error" && (
                <p className="mt-1 text-xs text-red-600">
                  Couldn&apos;t save. Try again.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-3">
                {o.pieces.map((p) => (
                  <div key={p.id} className="w-24">
                    {p.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.url}
                        alt={p.name}
                        className="h-24 w-24 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-[#2b2420]/5 text-[10px] text-gray-400">
                        no image
                      </div>
                    )}
                    <p className="mt-1 truncate text-[11px] text-gray-600">
                      {p.name}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-sm text-gray-700">{o.rationale}</p>

              {o.missingPiece && (
                <div className="mt-3 rounded-lg bg-[#f5e9d2] p-3 text-sm">
                  <span className="font-medium">Complete it with:</span>{" "}
                  {o.missingPiece}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {o.missingPieceLinks.map((link, j) => (
                      <a
                        key={j}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-[#2b2420]/25 px-3 py-1 text-xs hover:bg-[#2b2420]/10"
                      >
                        Shop: {link.label} →
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {state?.outfits && state.outfits.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">
          Couldn&apos;t assemble an outfit from the current items. Try adding a
          few more pieces.
        </p>
      )}
    </div>
  );
}
