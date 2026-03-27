"use client";

import Masonry from "react-masonry-css";
import PhotoCard from "./PhotoCard";
import type { IPhoto } from "@/types";

interface MasonryGridProps {
  photos: IPhoto[];
  selected: Set<string>;
  isLocked: boolean;
  allowDownload?: boolean;
  onToggle: (id: string) => void;
  onPreview: (photo: IPhoto) => void;
}

const BREAKPOINTS = {
  default: 4,
  1280: 3,
  1024: 3,
  768: 2,
  640: 2,
  480: 2,
};

export default function MasonryGrid({
  photos,
  selected,
  isLocked,
  allowDownload,
  onToggle,
  onPreview,
}: MasonryGridProps) {
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-[#EDE7DD] flex items-center justify-center mb-4">
          <span className="text-2xl">📷</span>
        </div>
        <p className="font-display text-lg text-[#2B2B2B] mb-1">No photos yet</p>
        <p className="text-sm text-[#6B6B6B]">Photos will appear here once uploaded by Sam&apos;s Creations.</p>
      </div>
    );
  }

  return (
    <Masonry
      breakpointCols={BREAKPOINTS}
      className="masonry-grid"
      columnClassName="masonry-col"
    >
      {photos.map((photo, i) => (
        <PhotoCard
          key={photo._id}
          photo={photo}
          isSelected={selected.has(photo._id)}
          isLocked={isLocked}
          allowDownload={allowDownload}
          priority={i < 8}
          onToggle={onToggle}
          onPreview={onPreview}
        />
      ))}
    </Masonry>
  );
}
