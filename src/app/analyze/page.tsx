"use client";
// ^ This line means "run this component in the browser." We need it because the
//   page uses interactive things (file uploads, buttons, state) that only exist
//   in the browser, not on the server.

import { useState } from "react";
import type { OutfitFeedback } from "@/lib/ai/types";

// A picked image, kept in two forms: a preview URL to show it, and the base64
// data we send to our backend.
interface PickedImage {
  previewUrl: string;
  data: string; // base64 (no "data:...;base64," prefix)
  mimeType: string;
}

// Reads a File the user picked and converts it to base64 text.
function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result looks like "data:image/png;base64,AAAA..."; we split off
      // the prefix and keep just the "AAAA..." part.
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve({ data: base64, mimeType: file.type || "image/jpeg" });
    };
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  // "state" = data that can change while the page is open. When it changes,
  // React re-draws the parts of the screen that use it.
  const [images, setImages] = useState<PickedImage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<OutfitFeedback | null>(null);

  // Called whenever the user picks files.
  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const picked = await Promise.all(
      files.map(async (file) => {
        const { data, mimeType } = await fileToBase64(file);
        return {
          previewUrl: URL.createObjectURL(file),
          data,
          mimeType,
        };
      })
    );
    setImages((prev) => [...prev, ...picked]);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  // Called when the user clicks "Get styling feedback".
  async function handleSubmit() {
    setError(null);
    setFeedback(null);

    if (images.length === 0) {
      setError("Please add at least one clothing photo first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map((img) => ({ data: img.data, mimeType: img.mimeType })),
          question,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Request failed.");
      }
      setFeedback(json as OutfitFeedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-center">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Analyze an outfit
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-gray-500">
          Upload clothing photos and get instant AI styling feedback — no login
          needed.
        </p>
      </header>

      {/* --- Upload area --- */}
      <section className="mx-auto max-w-xl rounded-2xl border border-[#2b2420]/15 p-8">
        <label className="block text-base font-medium">Your clothing photos</label>

        <div className="mt-4 flex flex-wrap justify-center gap-4">
          {images.map((img, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt={`Uploaded item ${i + 1}`}
                className="h-36 w-36 rounded-xl object-cover"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black text-sm text-white"
                aria-label="Remove image"
              >
                ✕
              </button>
            </div>
          ))}

          <label className="flex h-36 w-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#2b2420]/25 text-center text-sm text-gray-500 hover:border-[#E86A45]">
            <span className="text-4xl leading-none">+</span>
            <span className="mt-1">Add photo</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </div>

        {/* --- Question box --- */}
        <label className="mt-8 block text-base font-medium">
          Ask something (optional)
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Is this a good combo for a casual dinner? What shoes go with this?"
          rows={4}
          className="mt-3 w-full rounded-xl border border-[#2b2420]/25 p-4 text-base outline-none focus:border-[#E86A45]"
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-6 w-full rounded-full bg-black px-8 py-4 text-base font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Analyzing…" : "Get styling feedback"}
        </button>

        {error && <p className="mt-4 text-base text-red-600">{error}</p>}
      </section>

      {/* --- Results --- */}
      {feedback && (
        <section className="mx-auto mt-10 max-w-xl space-y-6 text-left">
          <div className="rounded-xl border border-[#2b2420]/15 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Overall</h2>
              {feedback.rating != null && (
                <span className="rounded-full bg-black px-3 py-1 text-sm font-medium text-white">
                  {feedback.rating}/10
                </span>
              )}
            </div>
            <p className="mt-2 text-gray-700">{feedback.summary}</p>
          </div>

          {feedback.whatWorks.length > 0 && (
            <div className="rounded-xl border border-[#2b2420]/15 p-5">
              <h3 className="font-semibold text-green-700">What works</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
                {feedback.whatWorks.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {feedback.whatToImprove.length > 0 && (
            <div className="rounded-xl border border-[#2b2420]/15 p-5">
              <h3 className="font-semibold text-amber-700">What to improve</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
                {feedback.whatToImprove.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {feedback.suggestions.length > 0 && (
            <div className="rounded-xl border border-[#2b2420]/15 p-5">
              <h3 className="font-semibold">Pieces to consider adding</h3>
              <div className="mt-3 space-y-4">
                {feedback.suggestions.map((s, i) => (
                  <div key={i} className="rounded-lg bg-[#f5e9d2] p-4">
                    <p className="font-medium">{s.item}</p>
                    <p className="mt-1 text-sm text-gray-600">{s.reason}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {s.shopLinks.map((link, j) => (
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
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
