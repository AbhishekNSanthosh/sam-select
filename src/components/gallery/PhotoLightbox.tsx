"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { IPhoto } from "@/types";

interface PhotoLightboxProps {
  photo: IPhoto;
  photos: IPhoto[];
  totalPhotos: number;
  isSelected: boolean;
  isLocked: boolean;
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
  onClose,
  onToggle,
  onNavigate,
}: PhotoLightboxProps) {
  const currentIndex = photos.findIndex((p) => p._id === photo._id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(photos[currentIndex - 1]);
      if (e.key === "ArrowRight" && hasNext) onNavigate(photos[currentIndex + 1]);
      if (e.key === " ") { e.preventDefault(); if (!isLocked) onToggle(photo._id); }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [photo, hasPrev, hasNext, photos, currentIndex, isLocked, onClose, onNavigate, onToggle]);

  return (
    <div className="fixed inset-0 z-50 backdrop flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 glass border-b border-white/20">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-[#6B6B6B] hover:text-[#2B2B2B] transition-colors"
        >
          <X size={18} />
          <span className="text-sm">Close</span>
        </button>
        <span className="text-sm text-[#6B6B6B]">
          {currentIndex + 1} / {totalPhotos}
        </span>
        {!isLocked && (
          <button
            onClick={() => onToggle(photo._id)}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200",
              isSelected
                ? "bg-[#D6C3A3] text-white"
                : "bg-white text-[#2B2B2B] border border-[#EDE7DD] hover:border-[#D6C3A3]"
            )}
          >
            {isSelected ? (
              <>
                <Check size={14} className="stroke-[3]" /> Selected
              </>
            ) : (
              "Select Photo"
            )}
          </button>
        )}
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center relative px-16 py-4">
        {/* Prev */}
        {hasPrev && (
          <button
            onClick={() => onNavigate(photos[currentIndex - 1])}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors z-10"
          >
            <ChevronLeft size={20} className="text-[#2B2B2B]" />
          </button>
        )}

        <div className="relative max-w-full max-h-full flex items-center justify-center animate-scale-in">
          <Image
            src={photo.thumbnailUrl.replace(/=s\d+$/, "=s1600")}
            alt={photo.filename}
            width={photo.width ?? 1200}
            height={photo.height ?? 800}
            className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl"
            priority
          />
          {isSelected && (
            <div className="absolute top-3 right-3 w-8 h-8 bg-[#D6C3A3] rounded-full flex items-center justify-center shadow">
              <Check size={16} className="text-white stroke-[3]" />
            </div>
          )}
        </div>

        {/* Next */}
        {hasNext && (
          <button
            onClick={() => onNavigate(photos[currentIndex + 1])}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors z-10"
          >
            <ChevronRight size={20} className="text-[#2B2B2B]" />
          </button>
        )}
      </div>

      {/* Filename */}
      <div className="text-center py-2 text-xs text-white/50">
        {photo.filename}
      </div>
    </div>
  );
}
