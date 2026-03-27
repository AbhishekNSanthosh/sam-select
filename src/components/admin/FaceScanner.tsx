"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Square, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function FaceScanner({ eventId, onComplete }: { eventId: string; onComplete?: () => void }) {
  const [isScanning, setIsScanning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "loading_models" | "scanning" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const cancelRef = useRef(false);

  // Load models in background when component mounts
  useEffect(() => {
    import("@vladmandic/face-api").then((faceapi) => {
      const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model";
      Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]).catch(() => {/* silent background load */});
    });
  }, []);

  function loadImageElement(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      // Route through our CORS proxy so canvas operations work
      img.src = `/api/photos/proxy?url=${encodeURIComponent(url)}`;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  }

  async function startScan() {
    setIsScanning(true);
    setPhase("loading_models");
    cancelRef.current = false;
    setProgress(0);
    setErrorMsg("");

    try {
      const faceapi = await import("@vladmandic/face-api");
      const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model";

      if (!faceapi.nets.ssdMobilenetv1.isLoaded) {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
      }

      setPhase("scanning");

      // Get total count first
      const countRes = await fetch(`/api/photos?eventId=${eventId}&limit=1`);
      const countData = await countRes.json();
      if (!countData.success) throw new Error("Could not fetch photos");
      const totalPhotos = countData.data.total;
      setTotal(totalPhotos);

      let page = 1;
      let scanned = 0;

      while (!cancelRef.current) {
        const phRes = await fetch(`/api/photos?eventId=${eventId}&page=${page}&limit=20`);
        const phData = await phRes.json();
        if (!phData.success || phData.data.photos.length === 0) break;

        for (const photo of phData.data.photos) {
          if (cancelRef.current) break;

          // Skip already indexed photos
          if (photo.faceDescriptors?.length > 0) {
            scanned++;
            setProgress(scanned);
            continue;
          }

          try {
            const img = await loadImageElement(photo.thumbnailUrl);
            const detections = await faceapi
              .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
              .withFaceLandmarks()
              .withFaceDescriptors();

            const descriptors = detections.map((d) => Array.from(d.descriptor));

            await fetch(`/api/admin/events/${eventId}/faces`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ photoId: photo._id, faceDescriptors: descriptors }),
            });
          } catch {
            // Photo couldn't be scanned (e.g., CORS, bad URL) — skip it
          }

          scanned++;
          setProgress(scanned);
        }

        if (!phData.data.hasMore) break;
        page++;
      }

      if (!cancelRef.current) {
        setPhase("done");
        onComplete?.();
      } else {
        setPhase("idle");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Scan failed");
      setPhase("error");
    } finally {
      setIsScanning(false);
    }
  }

  function stopScan() {
    cancelRef.current = true;
    setIsScanning(false);
    setPhase("idle");
  }

  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-[#EDE7DD] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#2B2B2B]">AI Face Scanner</h3>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Index all faces so clients can use "Find My Photos"
          </p>
        </div>
        <div className="shrink-0 ml-4">
          {phase === "loading_models" ? (
            <span className="flex items-center gap-1.5 text-xs text-[#B89B72]">
              <Loader2 size={13} className="animate-spin" /> Loading models…
            </span>
          ) : isScanning ? (
            <button
              onClick={stopScan}
              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-red-100 transition-colors"
            >
              <Square size={11} fill="currentColor" /> Stop
            </button>
          ) : (
            <button
              onClick={startScan}
              className="px-3 py-1.5 bg-[#D6C3A3] text-white rounded-lg text-xs font-semibold shadow hover:bg-[#C8A96A] transition-colors flex items-center gap-1.5"
            >
              <Play size={11} fill="currentColor" />
              {phase === "done" ? "Re-scan" : "Start Scan"}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar while scanning */}
      {(phase === "scanning" || phase === "loading_models") && (
        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-[#6B6B6B] mb-1.5 font-semibold">
            <span>{phase === "loading_models" ? "Loading AI models…" : `Scanned ${progress} of ${total} photos`}</span>
            {phase === "scanning" && <span>{percentage}%</span>}
          </div>
          <div className="h-1.5 bg-[#F5F2EE] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#D6C3A3] to-[#C8A96A] rounded-full transition-all duration-300"
              style={{ width: phase === "loading_models" ? "15%" : `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Done */}
      {phase === "done" && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <CheckCircle2 size={13} />
          Scan complete — {total} photos indexed
        </div>
      )}

      {/* Error */}
      {phase === "error" && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle size={13} />
          {errorMsg || "Scan failed. Check the console for details."}
        </div>
      )}
    </div>
  );
}
