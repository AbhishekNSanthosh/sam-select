"use client";

import { useEffect, useCallback, useState } from "react";
import Image from "next/image";
import { X, Check, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";
import type { IPhoto } from "@/types";

interface PhotoLightboxProps {
  photo: IPhoto;
  photos: IPhoto[];
  totalPhotos: number;
  isSelected: boolean;
  isLocked: boolean;
  allowDownload?: boolean;
  onClose: () => void;
  onToggle: (id: string) => void;
  onNavigate: (photo: IPhoto) => void;
}

export default function PhotoLightbox({
  photo,
  photos,
  totalPhotos,
  isSelected,
  isLocked,
  allowDownload,
  onClose,
  onToggle,
  onNavigate,
}: PhotoLightboxProps) {
  const currentIndex = photos.findIndex((p) => p._id === photo._id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  useBackButtonClose(true, onClose);

  // Track whether the full-res image has loaded
  const [fullLoaded, setFullLoaded] = useState(false);

  // Reset loaded state whenever photo changes
  useEffect(() => {
    setFullLoaded(false);
  }, [photo._id]);

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(photos[currentIndex - 1]);
  }, [hasPrev, onNavigate, photos, currentIndex]);

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(photos[currentIndex + 1]);
  }, [hasNext, onNavigate, photos, currentIndex]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === " ") {
        e.preventDefault();
        if (!isLocked) onToggle(photo._id);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [photo._id, isLocked, onClose, onToggle, goPrev, goNext]);

  // Border colour adapts to bg
  const borderColor = "border-[#D6C3A3]/20";
  const textMuted = "text-[#6B6B6B]";
  const textMain = "text-[#2B2B2B]";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#FAF8F5" }}
    >
      {/* ── Top bar ── */}
      <div className={cn("flex items-center justify-between px-4 py-3 border-b shrink-0 bg-white", borderColor)}>
        <button
          onClick={onClose}
          className={cn("flex items-center gap-2 transition-colors hover:text-[#2B2B2B]", textMuted)}
          aria-label="Close"
        >
          <X size={20} />
          <span className="text-sm hidden sm:inline">Close</span>
        </button>

        <span className={cn("text-sm tabular-nums", textMuted)}>
          {currentIndex + 1} / {totalPhotos}
        </span>

        {/* Top-right actions */}
        <div className="flex items-center gap-2">
          {allowDownload && (
            <a
              href={`/api/photos/${photo._id}/download`}
              download
              className={cn(
                "flex items-center gap-1.5 text-sm transition-colors px-3 py-1.5 rounded-xl border hover:border-[#D6C3A3] hover:text-[#2B2B2B]",
                textMuted,
                "border-[#EDE7DD]"
              )}
              title="Download"
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={15} />
              <span className="hidden sm:inline">Download</span>
            </a>
          )}

          {!isLocked && (
            <button
              onClick={() => onToggle(photo._id)}
              className={cn(
                "flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-xl transition-all duration-200",
                isSelected
                  ? "bg-[#D6C3A3] text-white shadow-md shadow-[#D6C3A3]/30 hover:bg-[#C8A96A]"
                  : "bg-white text-[#2B2B2B] border border-[#EDE7DD] hover:border-[#D6C3A3]"
              )}
              aria-label={isSelected ? "Deselect this photo" : "Select this photo"}
            >
              {isSelected ? (
                <>
                  <Check size={14} className="stroke-[3]" />
                  <span>Selected</span>
                </>
              ) : (
                <span>Select Photo</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Main image area ── */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#F5F2EE]">

        {/* Prev arrow */}
        {hasPrev && (
          <button
            onClick={goPrev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white hover:bg-[#EDE7DD] border border-[#EDE7DD] rounded-full flex items-center justify-center transition-all duration-150 shadow-sm"
            aria-label="Previous photo"
          >
            <ChevronLeft size={22} className={textMain} />
          </button>
        )}

        {/* Image wrapper — stacks thumbnail + full-res */}
        <div className="relative flex items-center justify-center w-full h-full px-14 sm:px-16 py-4 overflow-hidden touch-none">
          <TransformWrapper
            initialScale={1}
            minScale={1}
            maxScale={4}
            wheel={{ step: 0.1 }}
            doubleClick={{ step: 1 }}
            centerOnInit
          >
            <TransformComponent wrapperClass="!w-full !h-full flex items-center justify-center" contentClass="!w-auto !h-auto">
              <div className="relative flex items-center justify-center w-full h-full">
                {/* Blurred thumbnail placeholder — shows instantly, fades out when full-res ready */}
                <Image
                  src={photo.thumbnailUrl}
                  alt=""
                  aria-hidden
                  width={photo.width ?? 400}
                  height={photo.height ?? 300}
                  className={cn(
                    "absolute max-h-[calc(100vh-180px)] w-auto max-w-full object-contain rounded-lg pointer-events-none",
                    "blur-sm scale-105 transition-opacity duration-300",
                    fullLoaded ? "opacity-0" : "opacity-100"
                  )}
                  priority
                  unoptimized // avoid double optimizing thumbnail
                />

                {/* Full-resolution image */}
                <Image
                  key={photo._id}
                  src={photo.thumbnailUrl.replace(/=s\d+$/, "=s1600")}
                  alt={photo.filename}
                  width={photo.width ?? 1200}
                  height={photo.height ?? 800}
                  className={cn(
                    "max-h-[calc(100vh-180px)] w-auto max-w-full object-contain rounded-lg shadow-md transition-opacity duration-300 select-none",
                    fullLoaded ? "opacity-100" : "opacity-0"
                  )}
                  onLoad={() => setFullLoaded(true)}
                  unoptimized
                  draggable={false}
                />
              </div>
            </TransformComponent>
          </TransformWrapper>
          {/* Selected badge */}
          {isSelected && (
            <div className="absolute top-4 right-16 sm:right-4 flex items-center gap-1.5 bg-[#D6C3A3] text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow animate-scale-in">
              <Check size={12} className="stroke-[3]" />
              Selected
            </div>
          )}
        </div>

        {/* Next arrow */}
        {hasNext && (
          <button
            onClick={goNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white hover:bg-[#EDE7DD] border border-[#EDE7DD] rounded-full flex items-center justify-center transition-all duration-150 shadow-sm"
            aria-label="Next photo"
          >
            <ChevronRight size={22} className={textMain} />
          </button>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div className={cn("shrink-0 border-t px-4 py-3 flex items-center justify-between gap-3 bg-white", borderColor)}>
        {/* Filename */}
        <p className={cn("text-xs truncate max-w-[40%]", textMuted)}>{photo.filename}</p>

        {/* Keyboard hint */}
        <p className="text-xs text-[#B0A090] hidden sm:block">
          ← → navigate &nbsp;·&nbsp; Space to {isSelected ? "deselect" : "select"} &nbsp;·&nbsp; Esc close
        </p>

        {/* Mobile select button */}
        {!isLocked && (
          <button
            onClick={() => onToggle(photo._id)}
            className={cn(
              "sm:hidden flex items-center gap-1.5 text-sm font-semibold px-5 py-2 rounded-xl transition-all duration-200 shrink-0",
              isSelected
                ? "bg-[#D6C3A3] text-white"
                : "bg-[#F5F2EE] text-[#2B2B2B] border border-[#EDE7DD]"
            )}
          >
            {isSelected ? (
              <><Check size={14} className="stroke-[3]" /> Selected</>
            ) : (
              "Select"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
