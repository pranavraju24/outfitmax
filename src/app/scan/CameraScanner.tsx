"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QuickDetection } from "@/lib/ai/types";
import { saveScannedGarment } from "./actions";

// How often Auto-scan grabs a frame (ms). The free Gemini tier allows ~10-15
// requests/min, so going much faster just causes throttling. A busy-guard also
// prevents stacking requests.
const AUTO_INTERVAL_MS = 2500;

// Downscale frames before sending — far less data to upload and much faster
// inference than a full 720p/1080p frame.
const MAX_DIM = 512;
const JPEG_QUALITY = 0.55;

interface Detected {
  id: number;
  thumbnail: string; // data URL, for preview
  base64: string; // raw frame, for saving
  mimeType: string;
  detection: QuickDetection;
  status: "pending" | "saving" | "added" | "error";
  message?: string;
}

export default function CameraScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const busyRef = useRef(false);
  const idRef = useRef(0);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Detected[]>([]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
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
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  // Grab the current frame, downscaled, as a JPEG.
  const captureFrame = useCallback(() => {
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
  }, []);

  const detectOnce = useCallback(async () => {
    if (busyRef.current) return;
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
      if (!res.ok) return; // throttled/transient — the next frame will retry

      const detection = json.detection as QuickDetection;
      const name = (detection?.name ?? "").trim().toLowerCase();
      if (!detection?.present || !name || name === "unknown") return;

      setItems((prev) => {
        if (prev.some((d) => d.detection.name.trim().toLowerCase() === name)) {
          return prev; // dedup: already captured this item
        }
        return [
          {
            id: ++idRef.current,
            thumbnail: frame.dataUrl,
            base64: frame.base64,
            mimeType: "image/jpeg",
            detection,
            status: "pending",
          },
          ...prev,
        ];
      });
    } catch {
      // ignore; next capture tries again
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [captureFrame]);

  useEffect(() => {
    if (!scanning) return;
    const timer = setInterval(detectOnce, AUTO_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [scanning, detectOnce]);

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

  return (
    <div className="mx-auto mt-8 max-w-xl">
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
      <canvas ref={canvasRef} className="hidden" />

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
          Auto-scanning every {AUTO_INTERVAL_MS / 1000}s — hold each item steady
          for a moment.
        </p>
      )}

      {items.length > 0 && (
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
                <p className="truncate text-sm font-medium">
                  {d.detection.name}
                </p>
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
