"use client";

import { useRef, useState } from "react";
import type { QuickDetection } from "@/lib/ai/types";
import { saveScannedGarment } from "./actions";
import DetectedItems, { type ScannedItem } from "./DetectedItems";

const SAMPLE_INTERVAL_SEC = 2; // grab a frame every ~2s of footage
const MAX_FRAMES = 20; // cap total frames (→ caps API calls)
const MAX_DIM = 512;
const JPEG_QUALITY = 0.55;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function VideoScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const idRef = useRef(0);

  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Wait for the video to seek to a timestamp (so the frame is decoded).
  function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
    return new Promise((resolve) => {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      };
      video.addEventListener("seeked", onSeeked);
      video.currentTime = t;
    });
  }

  // Draw the current video frame onto the canvas, downscaled, as a JPEG.
  function grabFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return null;

    const scale = Math.min(
      1,
      MAX_DIM / Math.max(video.videoWidth, video.videoHeight)
    );
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    return { dataUrl, base64: dataUrl.split(",")[1] ?? "" };
  }

  // Send one frame for detection; add it to the list if it's a new garment.
  async function detectFrame(frame: { dataUrl: string; base64: string }) {
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: frame.base64, mimeType: "image/jpeg" }),
      });
      const json = await res.json();
      if (!res.ok) return; // throttled/transient — just skip this frame

      const detection = json.detection as QuickDetection;
      const name = (detection?.name ?? "").trim().toLowerCase();
      if (!detection?.present || !name || name === "unknown") return;

      setItems((prev) => {
        if (prev.some((d) => d.detection.name.trim().toLowerCase() === name)) {
          return prev;
        }
        return [
          ...prev,
          {
            id: ++idRef.current,
            thumbnail: frame.dataUrl,
            base64: frame.base64,
            mimeType: "image/jpeg",
            detection,
            status: "pending",
          },
        ];
      });
    } catch {
      // ignore a single frame failure
    }
  }

  async function handleFile(file: File) {
    setError(null);
    setItems([]);
    setStatus("processing");

    const url = URL.createObjectURL(file);
    const video = videoRef.current!;
    video.src = url;
    video.muted = true;

    try {
      // Wait for metadata so we know the duration.
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("Could not read that video."));
      });

      const duration = video.duration;
      if (!isFinite(duration) || duration <= 0) {
        throw new Error(
          "Couldn't read the video's length. Try an MP4/MOV recorded on your phone."
        );
      }

      // Choose timestamps, capped at MAX_FRAMES.
      const interval = Math.max(SAMPLE_INTERVAL_SEC, duration / MAX_FRAMES);
      const timestamps: number[] = [];
      for (let t = 0; t < duration && timestamps.length < MAX_FRAMES; t += interval) {
        timestamps.push(t);
      }
      setProgress({ current: 0, total: timestamps.length });

      // Process frames one at a time (naturally paces API calls).
      for (let i = 0; i < timestamps.length; i++) {
        await seekTo(video, timestamps[i]);
        const frame = grabFrame();
        setProgress({ current: i + 1, total: timestamps.length });
        if (frame?.base64) {
          await detectFrame(frame);
          await sleep(250); // small gap to be gentle on the rate limit
        }
      }

      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process the video.");
      setStatus("idle");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function addToCloset(id: number) {
    const target = items.find((d) => d.id === id);
    if (!target) return;
    setItems((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "saving" } : d))
    );
    const result = await saveScannedGarment({
      image: target.base64,
      mimeType: target.mimeType,
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

  const pct =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <div className="mx-auto mt-8 max-w-xl">
      <div className="rounded-2xl border-2 border-dashed border-[#2b2420]/25 p-8 text-center">
        <label className="block text-lg font-semibold">
          Upload or record a video
        </label>
        <p className="mt-2 text-sm text-gray-500">
          Slowly pan across your clothes. We&apos;ll scan through it and detect
          each item.
        </p>
        <input
          type="file"
          accept="video/*"
          disabled={status === "processing"}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="mt-5 block w-full max-w-xs cursor-pointer text-sm file:mr-4 file:rounded-full file:border-0 file:bg-black file:px-5 file:py-2.5 file:text-sm file:font-medium file:text-white mx-auto"
        />
      </div>

      {/* Hidden media elements used for frame extraction */}
      <video ref={videoRef} playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {status === "processing" && (
        <div className="mt-5">
          <p className="text-sm text-gray-600">
            Analyzing frame {progress.current} of {progress.total}…
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#2b2420]/10">
            <div
              className="h-full bg-[#E86A45] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {status === "done" && items.length === 0 && (
        <p className="mt-6 text-sm text-gray-500">
          No clothing items detected. Try a slower pan or better lighting.
        </p>
      )}

      <DetectedItems items={items} onAdd={addToCloset} onDismiss={dismiss} />
    </div>
  );
}
