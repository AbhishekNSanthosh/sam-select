"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";
import type { IPhoto } from "@/types";

interface SelectionDrawerProps {
  open: boolean;
  selectedIds: Set<string>;
  isLocked: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onPreview: (photo: IPhoto) => void;
}

export default function SelectionDrawer({
  open,
  selectedIds,
  isLocked,
  onClose,
  onRemove,
  onPreview,
}: SelectionDrawerProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<IPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const prevIdsRef = useRef<string>("");

  useBackButtonClose(open, onClose);

  // Fetch full photo objects whenever the drawer opens or selection changes
  useEffect(() => {
    if (!open || selectedIds.size === 0) {
      if (selectedIds.size === 0) setSelectedPhotos([]);
      return;
    }

    const idsKey = Array.from(selectedIds).sort().join(",");
    if (idsKey === prevIdsRef.current) return; // no change
    prevIdsRef.current = idsKey;

    setLoading(true);
    fetch("/api/selections")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data?.selectedPhotoIds)) {
          // populated: array of full photo objects
          const photos = data.data.selectedPhotoIds.filter(
            (p: unknown) => typeof p === "object" && p !== null && "_id" in (p as object)
          ) as IPhoto[];
          setSelectedPhotos(photos);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, selectedIds]);

  // Sync removals instantly — remove from local state without re-fetching
  useEffect(() => {
    setSelectedPhotos((prev) => prev.filter((p) => selectedIds.has(p._id)));
  }, [selectedIds]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const count = selectedPhotos.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[opacity]",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[32px] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.15)]",
          "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform",
          "max-h-[90vh] md:max-h-[80vh] flex flex-col",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#EDE7DD]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#EDE7DD] shrink-0">
          <div>
            <h2 className="font-display text-lg text-[#2B2B2B]">Your Selections</h2>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              {count} photo{count !== 1 ? "s" : ""} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#EDE7DD] transition-colors"
            aria-label="Close"
          >
            <X size={18} className="text-[#6B6B6B]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            // Skeleton while fetching
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Array.from({ length: Math.max(selectedIds.size, 6) }).map((_, i) => (
                <div key={i} className="skeleton rounded-xl aspect-square" />
              ))}
            </div>
          ) : count === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-[#EDE7DD] flex items-center justify-center mb-3">
                <span className="text-xl">🖼️</span>
              </div>
              <p className="text-[#6B6B6B] text-sm">No photos selected yet.</p>
              <p className="text-[#6B6B6B] text-xs mt-1">Tap photos in the gallery to add them.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {selectedPhotos.map((photo) => (
                <div
                  key={photo._id}
                  className="relative group rounded-xl overflow-hidden aspect-square cursor-pointer"
                  onClick={() => {
                    onClose();
                    // Small delay so drawer closes before lightbox opens
                    setTimeout(() => onPreview(photo), 120);
                  }}
                  role="button"
                  aria-label={`View ${photo.filename}`}
                >
                  <Image
                    src={photo.thumbnailUrl}
                    alt={photo.filename}
                    fill
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                    sizes="(max-width: 640px) 33vw, 25vw"
                  />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-150 rounded-xl" />

                  {/* Remove button — always visible, top-right */}
                  {!isLocked && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(photo._id);
                      }}
                      aria-label="Remove from selection"
                      className="absolute top-1 right-1 w-6 h-6 bg-white/90 hover:bg-red-500 rounded-full flex items-center justify-center shadow transition-colors duration-150 group/rm"
                    >
                      <X size={11} className="text-[#6B6B6B] group-hover/rm:text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
