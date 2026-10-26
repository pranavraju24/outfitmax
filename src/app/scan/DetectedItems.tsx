"use client";

import type { GarmentTags, QuickDetection } from "@/lib/ai/types";

// One detected garment, shared by the camera, video, and photo scanners.
export interface ScannedItem {
  id: number;
  thumbnail: string; // data URL preview
  base64: string; // raw frame, for saving
  mimeType: string;
  detection: QuickDetection;
  // Full tags, set only by the multi-photo parser (which already has them).
  tags?: GarmentTags;
  status: "pending" | "saving" | "added" | "error";
  message?: string;
}

// Presentational list of detected items with Add / Skip controls.
export default function DetectedItems({
  items,
  onAdd,
  onDismiss,
}: {
  items: ScannedItem[];
  onAdd: (id: number) => void;
  onDismiss: (id: number) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-8 space-y-3">
      <h2 className="text-left text-lg font-semibold">
        Detected items ({items.length})
      </h2>
      {items.map((d) => (
        <div
          key={d.id}
          className="flex items-center gap-3 rounded-xl border border-[#2b2420]/15 p-3 text-left"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={d.thumbnail}
            alt={d.detection.name}
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{d.detection.name}</p>
            <p className="truncate text-xs text-gray-500">
              {[d.detection.category, d.detection.color]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {d.status === "error" && (
              <p className="text-xs text-red-600">{d.message}</p>
            )}
          </div>
          <div className="shrink-0">
            {d.status === "added" ? (
              <span className="text-sm text-green-700">Added ✓</span>
            ) : d.status === "saving" ? (
              <span className="text-sm text-gray-500">Saving…</span>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => onAdd(d.id)}
                  className="rounded-md bg-black px-3 py-1 text-xs font-medium text-white"
                >
                  Add
                </button>
                <button
                  onClick={() => onDismiss(d.id)}
                  className="rounded-md border border-[#2b2420]/25 px-3 py-1 text-xs"
                >
                  Skip
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
