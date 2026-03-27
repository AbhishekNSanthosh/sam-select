"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, AlertTriangle, Download, Expand } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { IPhoto } from "@/types";

interface PhotoCardProps {
  photo: IPhoto;
  isSelected: boolean;
  isLocked: boolean;
  allowDownload?: boolean;
  priority?: boolean;
  onToggle: (id: string) => void;
  onPreview: (photo: IPhoto) => void;
}

export default function PhotoCard({
  photo,
  isSelected,
  isLocked,
  allowDownload,
  priority,
  onToggle,
  onPreview,
}: PhotoCardProps) {
  const [loaded, setLoaded] = useState(false);

  // Single click → open lightbox for viewing / selecting
  function handleClick() {
    onPreview(photo);
  }

  // Dedicated select toggle — stops propagation so it doesn't also open preview
  function handleSelectClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isLocked) onToggle(photo._id);
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "relative group rounded-xl overflow-hidden cursor-pointer mb-3",
        "transition-all duration-200",
        isSelected
          ? "photo-selected ring-2 ring-[#D6C3A3]"
          : "hover:scale-[0.99]"
      )}
      role="button"
      aria-label={`View ${photo.filename}${isSelected ? " (selected)" : ""}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPreview(photo);
        }
      }}
    >
      {/* Skeleton loader */}
      {!loaded && (
        <div
          className="skeleton w-full rounded-xl"
          style={{
            paddingBottom:
              photo.height && photo.width
                ? `${(photo.height / photo.width) * 100}%`
                : "75%",
          }}
        />
      )}

      {/* Image */}
      <Image
        src={photo.thumbnailUrl}
        alt={photo.filename}
        width={photo.width ?? 400}
        height={photo.height ?? 300}
        priority={priority}
        className={cn(
          "w-full h-auto object-cover rounded-xl transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0 absolute inset-0"
        )}
        onLoad={() => setLoaded(true)}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />

      {/* Gradient overlay — stronger on hover */}
      <div
        className={cn(
          "absolute inset-0 rounded-xl transition-opacity duration-200",
          isSelected
            ? "bg-[#D6C3A3]/15 opacity-100"
            : "bg-black/0 group-hover:bg-black/20 opacity-100"
        )}
      />

      {/* Top-right: selection checkmark (always visible when selected, hover otherwise) */}
      {!isLocked && (
        <button
          onClick={handleSelectClick}
          aria-label={isSelected ? "Deselect photo" : "Select photo"}
          className={cn(
            "absolute top-2 right-2 w-7 h-7 rounded-full border-2 flex items-center justify-center",
            "transition-all duration-200 z-10",
            isSelected
              ? "bg-[#D6C3A3] border-[#D6C3A3] scale-100 shadow-md"
              : "bg-white/80 border-white/60 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100"
          )}
        >
          {isSelected && <Check size={14} className="text-white stroke-[3]" />}
        </button>
      )}

      {/* Blurry warning badge */}
      {photo.isBlurry && (
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-500/90 text-white text-[10px] font-medium px-2 py-0.5 rounded-full z-10">
          <AlertTriangle size={10} />
          Blurry
        </div>
      )}

      {/* Bottom action row — appears on hover */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 pb-2 pt-6 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-b-xl">
        {/* Expand icon hint */}
        <span className="flex items-center gap-1 text-white/80 text-[10px]">
          <Expand size={11} />
          <span className="hidden sm:inline">View</span>
        </span>

        <div className="flex items-center gap-1">
          {allowDownload && (
            <a
              href={`/api/photos/${photo._id}/download`}
              download
              onClick={(e) => e.stopPropagation()}
              className="bg-white/90 text-[#2B2B2B] w-6 h-6 rounded-full flex items-center justify-center hover:bg-white shadow"
              title="Download"
            >
              <Download size={11} />
            </a>
          )}
          {!isLocked && (
            <button
              onClick={handleSelectClick}
              className={cn(
                "text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow transition-all duration-150",
                isSelected
                  ? "bg-[#D6C3A3] text-white"
                  : "bg-white/90 text-[#2B2B2B] hover:bg-white"
              )}
            >
              {isSelected ? "✓ Selected" : "Select"}
            </button>
          )}
        </div>
      </div>

      {/* Mobile: always-visible select dot when selected */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#D6C3A3] border-2 border-[#D6C3A3] flex items-center justify-center shadow-md sm:hidden">
          <Check size={14} className="text-white stroke-[3]" />
        </div>
      )}
    </div>
  );
}
