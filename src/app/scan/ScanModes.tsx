"use client";

import { useState } from "react";
import CameraScanner from "./CameraScanner";
import VideoScanner from "./VideoScanner";
import PhotoScanner from "./PhotoScanner";

type Mode = "camera" | "video" | "photo";

export default function ScanModes() {
  const [mode, setMode] = useState<Mode>("camera");

  const tab = (active: boolean) =>
    `rounded-full px-5 py-2 text-sm font-semibold transition ${
      active ? "bg-[#E86A45] text-white" : "text-[#2b2420] hover:bg-[#2b2420]/5"
    }`;

  return (
    <div>
      <div className="mt-6 inline-flex flex-wrap justify-center gap-1 rounded-full border border-[#2b2420]/15 p-1">
        <button onClick={() => setMode("camera")} className={tab(mode === "camera")}>
          Live camera
        </button>
        <button onClick={() => setMode("video")} className={tab(mode === "video")}>
          Upload video
        </button>
        <button onClick={() => setMode("photo")} className={tab(mode === "photo")}>
          Upload photo
        </button>
      </div>

      {/* Switching modes unmounts the others (e.g. stops the live camera). */}
      {mode === "camera" && <CameraScanner />}
      {mode === "video" && <VideoScanner />}
      {mode === "photo" && <PhotoScanner />}
    </div>
  );
}
