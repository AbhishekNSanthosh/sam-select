"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera,
  Upload,
  X,
  ScanFace,
  AlertCircle,
  CheckCircle2,
  Loader2,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { IPhoto } from "@/types";

// ─── Module-level model cache ─────────────────────────────────────────────────
let modelsReady = false;
let modelLoadPromise: Promise<void> | null = null;

async function loadModels(): Promise<void> {
  if (modelsReady) return;
  if (modelLoadPromise) return modelLoadPromise;
  modelLoadPromise = (async () => {
    const faceapi = await import("@vladmandic/face-api");
    const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model";
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsReady = true;
  })();
  return modelLoadPromise;
}

function fileToImg(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase =
  | "idle"
  | "camera"       // live webcam view
  | "loading_models"
  | "analyzing"
  | "searching"
  | "results"
  | "no_face"
  | "no_results"
  | "error";

interface Props {
  eventId: string;
  isLocked: boolean;
  allowDownload?: boolean;
  onSelectPhoto: (photo: IPhoto) => void;
  onTogglePhoto: (id: string) => void;
  selectedIds: Set<string>;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SelfieSearch({
  eventId,
  isLocked,
  onSelectPhoto,
  onTogglePhoto,
  selectedIds,
  onClose,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [results, setResults] = useState<IPhoto[]>([]);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop webcam stream
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Warm up models in background
  useEffect(() => {
    if (!modelsReady) loadModels().catch(() => {});
  }, []);

  const reset = useCallback(() => {
    stopCamera();
    setPhase("idle");
    setResults([]);
    setPreviewDataUrl(null);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [stopCamera]);

  // Stop stream when component unmounts
  useEffect(() => stopCamera, [stopCamera]);

  // Open camera: use getUserMedia on desktop, capture attr on mobile
  async function openCamera() {
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isMobile) {
      // Mobile: let the browser handle it natively
      cameraInputRef.current?.click();
      return;
    }
    // Desktop: open webcam via getUserMedia
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setPhase("camera");
      // Attach stream to video element after render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 50);
    } catch (err) {
      setPhase("error");
      setErrorMsg("Camera access denied. Please allow camera access and try again.");
    }
  }

  // Capture a frame from the live video
  function captureFrame() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    stopCamera();
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
        handleFile(file);
      }
    }, "image/jpeg", 0.92);
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setPhase("error");
      setErrorMsg("Please upload an image file (JPG, PNG).");
      return;
    }

    setResults([]);
    setErrorMsg("");
    setPhase("analyzing"); // Instant feedback before heavy sync/async processing

    try {
      const imgElem = await fileToImg(file);

      // Generate preview
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 300 / Math.max(imgElem.naturalWidth, imgElem.naturalHeight));
      canvas.width = imgElem.naturalWidth * scale;
      canvas.height = imgElem.naturalHeight * scale;
      canvas.getContext("2d")!.drawImage(imgElem, 0, 0, canvas.width, canvas.height);
      setPreviewDataUrl(canvas.toDataURL("image/jpeg", 0.8));

      if (!modelsReady) {
        setPhase("loading_models");
        await loadModels();
      }

      setPhase("analyzing");
      const faceapi = await import("@vladmandic/face-api");

      const allDetections = await faceapi
        .detectAllFaces(imgElem, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      const confident = allDetections.filter((d) => d.detection.score >= 0.7);
      const pool = confident.length > 0 ? confident : allDetections.filter((d) => d.detection.score >= 0.5);

      if (pool.length === 0) {
        setPhase("no_face");
        return;
      }

      // Pick the largest face (the subject in a selfie)
      pool.sort((a, b) => b.detection.box.width * b.detection.box.height - a.detection.box.width * a.detection.box.height);
      const queryDescriptors = [Array.from(pool[0].descriptor)];

      setPhase("searching");

      const res = await fetch("/api/photos/face-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, queryDescriptors }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Search failed");

      setResults(data.data.photos);
      setPhase(data.data.photos.length === 0 ? "no_results" : "results");
    } catch (e) {
      console.error("SelfieSearch:", e);
      setPhase("error");
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const isProcessing = phase === "loading_models" || phase === "analyzing" || phase === "searching";


  // ─── Panel (always expanded — toggled by parent via modal sheet) ─────────────
  // ─── Expanded panel ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDE7DD]">
        <div className="flex items-center gap-2">
          <ScanFace size={14} className="text-[#B89B72]" />
          <span className="text-sm font-medium text-[#2B2B2B]">Find My Photos</span>
        </div>
        <button
          onClick={() => { reset(); onClose(); }}
          className="text-[#6B6B6B] hover:text-[#2B2B2B] transition-colors p-1"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-4">
        {/* Two action buttons */}
        {phase === "idle" && (
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="space-y-3"
          >
            {/* Camera button */}
            <button
              onClick={openCamera}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#D6C3A3] hover:bg-[#C8A96A] text-white transition-colors shadow-sm"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Camera size={16} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Open Camera</p>
                <p className="text-xs text-white/75">Take a selfie right now</p>
              </div>
            </button>

            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[#EDE7DD] bg-[#FBF9F6] hover:bg-white hover:border-[#D6C3A3] text-[#2B2B2B] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#D6C3A3]/15 flex items-center justify-center shrink-0">
                <Upload size={15} className="text-[#B89B72]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Upload a Photo</p>
                <p className="text-xs text-[#6B6B6B]">Choose from your gallery · JPG, PNG</p>
              </div>
            </button>
          </div>
        )}

        {/* Hidden file input — no capture (choose from gallery) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
        {/* Hidden camera input — front camera */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={onFileChange}
        />

        {/* Live webcam view */}
        {phase === "camera" && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]" // mirror for selfie feel
              />
              {/* Overlay hint */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent py-3 px-4 flex items-center justify-between">
                <span className="text-white/80 text-xs">Position your face in the frame</span>
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { stopCamera(); setPhase("idle"); }}
                className="flex-1 py-2.5 rounded-xl border border-[#EDE7DD] text-sm text-[#6B6B6B] hover:border-[#D6C3A3] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={captureFrame}
                className="flex-1 py-2.5 rounded-xl bg-[#D6C3A3] hover:bg-[#C8A96A] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <CircleDot size={15} /> Capture
              </button>
            </div>
          </div>
        )}

        {/* Processing State (Face ID Style) */}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-6 animate-fade-in relative">
            <style>{`
              @keyframes scan_laser {
                0% { transform: translateY(-30%); }
                50% { transform: translateY(80%); }
                100% { transform: translateY(-30%); }
              }
            `}</style>

            {/* Avatar with scanning effect */}
            <div className="relative w-24 h-24 rounded-full overflow-hidden shrink-0 border-4 border-[#FBF9F6] shadow-xl mb-6 ring-1 ring-[#D6C3A3]/40">
              {previewDataUrl ? (
                <img src={previewDataUrl} alt="Scanning" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#EDE7DD] flex flex-col items-center justify-center text-[#B89B72]">
                  <ScanFace size={28} />
                </div>
              )}
              
              {/* Laser overlay */}
              <div 
                className="absolute inset-x-0 w-full h-[60%] bg-gradient-to-b from-transparent via-white/80 to-transparent pointer-events-none" 
                style={{ animation: "scan_laser 2s ease-in-out infinite" }}
              />
            </div>

            {/* Status text & Progress */}
            <div className="text-center w-full max-w-[200px]">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Loader2 size={15} className="text-[#B89B72] animate-spin shrink-0" />
                <p className="text-sm font-semibold text-[#2B2B2B]">
                  {phase === "loading_models" && "Waking up AI..."}
                  {phase === "analyzing" && "Analyzing face..."}
                  {phase === "searching" && "Searching gallery..."}
                </p>
              </div>
              <div className="h-1.5 w-full bg-[#F5F2EE] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#D6C3A3] to-[#B89B72] rounded-full transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ width: phase === "loading_models" ? "25%" : phase === "analyzing" ? "65%" : "95%" }}
                />
              </div>
            </div>
            
          </div>
        )}

        {/* No face */}
        {phase === "no_face" && (
          <div className="flex items-center gap-2.5">
            <AlertCircle size={15} className="text-amber-500 shrink-0" />
            <span className="flex-1 text-sm text-amber-700">
              No face detected — try a clearer, well-lit photo.
            </span>
            <button onClick={reset} className="text-xs text-amber-600 font-semibold underline shrink-0">Retry</button>
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div className="flex items-center gap-2.5">
            <AlertCircle size={15} className="text-red-500 shrink-0" />
            <span className="flex-1 text-xs text-red-600">{errorMsg}</span>
            <button onClick={reset} className="text-xs text-red-500 font-semibold underline shrink-0">Retry</button>
          </div>
        )}

        {/* No results */}
        {phase === "no_results" && (
          <div className="flex items-center gap-3">
            {previewDataUrl && <img src={previewDataUrl} alt="Selfie" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-[#EDE7DD]" />}
            <div className="flex-1">
              <p className="text-sm font-medium text-[#2B2B2B]">No matches found</p>
              <p className="text-xs text-[#6B6B6B]">Try a different or clearer photo.</p>
            </div>
            <button onClick={reset} className="text-xs text-[#6B6B6B] font-semibold underline shrink-0">Retry</button>
          </div>
        )}

        {/* Results */}
        {phase === "results" && results.length > 0 && (
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              {previewDataUrl && (
                <img src={previewDataUrl} alt="Your selfie" className="w-9 h-9 rounded-full object-cover border-2 border-[#D6C3A3] shrink-0" />
              )}
              <p className="text-sm font-semibold text-[#2B2B2B] flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-green-500" />
                {results.length} photo{results.length !== 1 ? "s" : ""} found
              </p>
              <button onClick={reset} className="ml-auto text-xs text-[#6B6B6B] hover:text-[#2B2B2B] underline shrink-0">
                New search
              </button>
            </div>

            <div className="columns-2 sm:columns-3 gap-2 space-y-2">
              {results.map((photo) => {
                const sel = selectedIds.has(photo._id);
                // Route through proxy to avoid CORS/domain issues with Drive CDN
                const src = `/api/photos/proxy?url=${encodeURIComponent(photo.thumbnailUrl)}`;
                return (
                  <div
                    key={photo._id}
                    className="break-inside-avoid relative group rounded-xl overflow-hidden cursor-pointer bg-[#F5F2EE]"
                    style={{
                      aspectRatio: photo.width && photo.height
                        ? `${photo.width}/${photo.height}`
                        : "4/3",
                    }}
                    onClick={() => onSelectPhoto(photo)}
                  >
                    <img
                      src={src}
                      alt={photo.filename}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        // If proxy fails, try the direct URL
                        const target = e.currentTarget;
                        if (!target.dataset.fallback) {
                          target.dataset.fallback = "1";
                          target.src = photo.thumbnailUrl;
                        } else {
                          // Hide completely if both fail
                          target.style.display = "none";
                        }
                      }}
                      loading="lazy"
                    />
                    <div className={cn("absolute inset-0 transition-opacity duration-200", sel ? "bg-[#D6C3A3]/25" : "bg-black/0 group-hover:bg-black/20")} />
                    {sel && <div className="absolute inset-0 rounded-xl ring-2 ring-[#D6C3A3] ring-inset pointer-events-none" />}
                    {!isLocked && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onTogglePhoto(photo._id); }}
                        className={cn(
                          "absolute top-1.5 right-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm transition-all duration-150",
                          sel ? "bg-[#D6C3A3] text-white opacity-100" : "bg-white/90 text-[#2B2B2B] opacity-0 group-hover:opacity-100"
                        )}
                      >
                        {sel ? "✓" : "Select"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
