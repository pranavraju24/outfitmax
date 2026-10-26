"use client";

import { useRef, useState } from "react";
import type { GarmentTags } from "@/lib/ai/types";
import { saveTaggedGarment } from "./actions";
import DetectedItems, { type ScannedItem } from "./DetectedItems";

// Photos need more detail than live frames (to tell several items apart), so we
// downscale to a larger max dimension than the camera/video modes.
const MAX_DIM = 1024;
const JPEG_QUALITY = 0.7;

export default function PhotoScanner() {
  const idRef = useRef(0);
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function fileToFrame(file: File) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not read the image.");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    return { dataUrl, base64: dataUrl.split(",")[1] ?? "" };
  }

  async function handleFile(file: File) {
    setError(null);
    setItems([]);
    setStatus("processing");
    try {
      const frame = await fileToFrame(file);
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: frame.base64, mimeType: "image/jpeg" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Could not parse the photo.");

      const parsed = (json.items ?? []) as GarmentTags[];
      setItems(
        parsed.map((t) => ({
          id: ++idRef.current,
          thumbnail: frame.dataUrl, // all items share the one source photo
          base64: frame.base64,
          mimeType: "image/jpeg",
          detection: {
            present: true,
            name: t.name,
            category: t.category,
            color: t.color,
          },
          tags: t,
          status: "pending" as const,
        }))
      );
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process the photo.");
      setStatus("idle");
    }
  }

  async function addToCloset(id: number) {
    const target = items.find((d) => d.id === id);
    if (!target || !target.tags) return;
    setItems((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "saving" } : d))
    );
    const result = await saveTaggedGarment({
      image: target.base64,
      mimeType: target.mimeType,
      tags: target.tags,
    });
    setItems((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, status: result.ok ? "added" : "error", message: result.error }
          : d
      )
    );
  }

  function dismiss(id: number) {
    setItems((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="mx-auto mt-8 max-w-xl">
      <div className="rounded-2xl border-2 border-dashed border-[#2b2420]/25 p-8 text-center">
        <label className="block text-lg font-semibold">
          Upload a photo of your clothes
        </label>
        <p className="mt-2 text-sm text-gray-500">
          One photo can contain several items (a flat-lay or a pile) — we&apos;ll
          split it into individual pieces.
        </p>
        <input
          type="file"
          accept="image/*"
          disabled={status === "processing"}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="mx-auto mt-5 block w-full max-w-xs cursor-pointer text-sm file:mr-4 file:rounded-full file:border-0 file:bg-black file:px-5 file:py-2.5 file:text-sm file:font-medium file:text-white"
        />
      </div>

      {status === "processing" && (
        <p className="mt-5 text-sm text-gray-600">Analyzing the photo…</p>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {status === "done" && items.length === 0 && (
        <p className="mt-6 text-sm text-gray-500">
          No clothing items detected in that photo.
        </p>
      )}

      <DetectedItems items={items} onAdd={addToCloset} onDismiss={dismiss} />
    </div>
  );
}
