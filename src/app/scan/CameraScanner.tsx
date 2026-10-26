"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GarmentTags } from "@/lib/ai/types";
import { saveScannedGarment } from "./actions";

// How often Auto-scan grabs a frame (ms). Kept conservative so we stay within
// Gemini's free-tier rate limits; a "busy" guard also prevents stacking calls.
const AUTO_INTERVAL_MS = 4000;

interface Detection {
  id: number;
  thumbnail: string; // data URL, for showing a preview
  base64: string; // raw frame, for saving
  mimeType: string;
  tags: GarmentTags;
  status: "pending" | "saving" | "added" | "error";
  message?: string;
}

export default function CameraScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const busyRef = useRef(false); // a detection request is in flight
  const idRef = useRef(0);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);

  // --- Start the camera on mount, stop it on unmount ---
  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }, // back camera on phones
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setCameraError(
          "Couldn't access the camera. Grant camera permission and make sure you're on https:// or localhost."
        );
      }
    })();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Grab the current video frame as a JPEG.
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    return { dataUrl, base64: dataUrl.split(",")[1] ?? "" };
  }, []);

  // Capture one frame and ask the server what garment it sees.
  const detectOnce = useCallback(async () => {
    if (busyRef.current) return; // don't stack requests
    const frame = captureFrame();
    if (!frame || !frame.base64) return;

    busyRef.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: frame.base64, mimeType: "image/jpeg" }),
      });
      const json = await res.json();
      if (!res.ok) return; // skip quietly on a transient error during scanning

      const tags = json.tags as GarmentTags;
      const name = (tags?.name ?? "").trim().toLowerCase();
      if (!name || name === "unknown") return; // nothing recognizable in frame

      setDetections((prev) => {
        // Dedup: skip if we already have an item with this name.
        if (prev.some((d) => d.tags.name.trim().toLowerCase() === name)) {
          return prev;
        }
        return [
          {
            id: ++idRef.current,
            thumbnail: frame.dataUrl,
            base64: frame.base64,
            mimeType: "image/jpeg",
            tags,
            status: "pending",
          },
          ...prev,
        ];
      });
    } catch {
      // network hiccup — ignore and let the next capture try again
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [captureFrame]);

  // Auto-scan loop.
  useEffect(() => {
    if (!scanning) return;
    const timer = setInterval(detectOnce, AUTO_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [scanning, detectOnce]);

  async function addToCloset(id: number) {
    const target = detections.find((d) => d.id === id);
    if (!target) return;
    setDetections((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "saving" } : d))
    );
    const result = await saveScannedGarment({
      image: target.base64,
      mimeType: target.mimeType,
      tags: target.tags,
    });
    setDetections((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status: result.ok ? "added" : "error",
              message: result.error,
            }
          : d
      )
    );
  }

  function dismiss(id: number) {
    setDetections((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="mx-auto mt-8 max-w-xl">
      {/* Camera preview */}
      <div className="overflow-hidden rounded-2xl border border-[#2b2420]/15 bg-black">
        {cameraError ? (
          <div className="p-8 text-center text-sm text-red-600">
            {cameraError}
          </div>
        ) : (
          <video
            ref={videoRef}
            muted
            playsInline
            className="h-72 w-full object-cover"
          />
        )}
      </div>
      {/* Hidden canvas used to grab frames */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={detectOnce}
          disabled={!!cameraError || busy}
          className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Detecting…" : "Capture item"}
        </button>
        <button
          onClick={() => setScanning((s) => !s)}
          disabled={!!cameraError}
          className={`rounded-full px-6 py-3 text-sm font-semibold transition ${
            scanning
              ? "bg-[#E86A45] text-white hover:bg-[#d65b38]"
              : "border border-[#2b2420]/25 text-[#2b2420] hover:bg-[#2b2420]/5"
          }`}
        >
          {scanning ? "Stop auto-scan" : "Start auto-scan"}
        </button>
      </div>
      {scanning && (
        <p className="mt-2 text-center text-xs text-gray-500">
          Auto-scanning every {AUTO_INTERVAL_MS / 1000}s — slowly pan across your
          clothes.
        </p>
      )}

      {/* Detected items */}
      {detections.length > 0 && (
        <div className="mt-8 space-y-3">
          <h2 className="text-left text-lg font-semibold">
            Detected items ({detections.length})
          </h2>
          {detections.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 rounded-xl border border-[#2b2420]/15 p-3 text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={d.thumbnail}
                alt={d.tags.name}
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.tags.name}</p>
                <p className="truncate text-xs text-gray-500">
                  {[d.tags.category, d.tags.color].filter(Boolean).join(" · ")}
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
                      onClick={() => addToCloset(d.id)}
                      className="rounded-md bg-black px-3 py-1 text-xs font-medium text-white"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => dismiss(d.id)}
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
      )}
    </div>
  );
}
