"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { IPhoto } from "@/types";

interface PhotoCardProps {
  photo: IPhoto;
  isSelected: boolean;
  isLocked: boolean;
  onToggle: (id: string) => void;
  onPreview: (photo: IPhoto) => void;
}

export default function PhotoCard({
  photo,
  isSelected,
  isLocked,
  onToggle,
  onPreview,
}: PhotoCardProps) {
  const [loaded, setLoaded] = useState(false);

  function handleClick(e: React.MouseEvent) {
    // Long press / double click = preview; single click = select
    if (!isLocked) {
      onToggle(photo._id);
    }
  }

  function handlePreviewClick(e: React.MouseEvent) {
    e.stopPropagation();
    onPreview(photo);
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "relative group rounded-xl overflow-hidden cursor-pointer mb-3",
        "transition-all duration-200",
        isSelected ? "photo-selected scale-[0.98]" : "hover:scale-[0.99]",
        isLocked && "cursor-default"
      )}
      role="checkbox"
      aria-checked={isSelected}
      tabIndex={0}
      onKeyDown={(e) => e.key === " " && handleClick(e as unknown as React.MouseEvent)}
    >
      {/* Skeleton loader */}
      {!loaded && (
        <div
          className="skeleton w-full rounded-xl"
          style={{ paddingBottom: photo.height && photo.width ? `${(photo.height / photo.width) * 100}%` : "75%" }}
        />
      )}

      {/* Image */}
      <Image
        src={photo.thumbnailUrl}
        alt={photo.filename}
        width={photo.width ?? 400}
        height={photo.height ?? 300}
        className={cn(
          "w-full h-auto object-cover rounded-xl transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0 absolute inset-0"
        )}
        onLoad={() => setLoaded(true)}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        unoptimized
      />

      {/* Hover overlay */}
      <div
        className={cn(
          "absolute inset-0 rounded-xl transition-opacity duration-200",
          isSelected
            ? "bg-[#D6C3A3]/20 opacity-100"
            : "bg-black/0 group-hover:bg-black/10 opacity-100"
        )}
      />

      {/* Selection checkmark */}
      <div
        className={cn(
          "absolute top-2 right-2 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200",
          isSelected
            ? "bg-[#D6C3A3] border-[#D6C3A3] scale-100"
            : "bg-white/80 border-white/60 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100"
        )}
      >
        {isSelected && <Check size={14} className="text-white stroke-[3]" />}
      </div>

      {/* Blurry warning badge */}
      {photo.isBlurry && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-amber-500/90 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
          <AlertTriangle size={10} />
          Blurry
        </div>
      )}

      {/* Preview button */}
      <button
        onClick={handlePreviewClick}
        className={cn(
          "absolute bottom-2 right-2 bg-white/90 text-[#2B2B2B] text-[10px] font-medium px-2 py-0.5 rounded-full",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-white"
        )}
      >
        View
      </button>
    </div>
  );
}
