"use client";

import { useState } from "react";
import CameraScanner from "./CameraScanner";
import VideoScanner from "./VideoScanner";

export default function ScanModes() {
  const [mode, setMode] = useState<"camera" | "video">("camera");

  const tab = (active: boolean) =>
    `rounded-full px-5 py-2 text-sm font-semibold transition ${
      active ? "bg-[#E86A45] text-white" : "text-[#2b2420] hover:bg-[#2b2420]/5"
    }`;

  return (
    <div>
      <div className="mt-6 inline-flex rounded-full border border-[#2b2420]/15 p-1">
        <button onClick={() => setMode("camera")} className={tab(mode === "camera")}>
          Live camera
        </button>
        <button onClick={() => setMode("video")} className={tab(mode === "video")}>
          Upload video
        </button>
      </div>

      {/* Switching modes unmounts the other (e.g. stops the live camera). */}
      {mode === "camera" ? <CameraScanner /> : <VideoScanner />}
    </div>
  );
}
