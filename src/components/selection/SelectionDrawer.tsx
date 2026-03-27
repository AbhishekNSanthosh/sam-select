"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { IPhoto } from "@/types";

interface SelectionDrawerProps {
  open: boolean;
  photos: IPhoto[];
  selectedIds: Set<string>;
  isLocked: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
}

export default function SelectionDrawer({
  open,
  photos,
  selectedIds,
  isLocked,
  onClose,
  onRemove,
}: SelectionDrawerProps) {
  const selectedPhotos = photos.filter((p) => selectedIds.has(p._id));
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          ref={backdropRef}
          className="fixed inset-0 z-40 backdrop"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl",
          "transition-transform duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "max-h-[85vh] flex flex-col",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[#EDE7DD]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-[#EDE7DD]">
          <div>
            <h2 className="font-display text-lg text-[#2B2B2B]">Your Selections</h2>
            <p className="text-sm text-[#6B6B6B]">
              {selectedPhotos.length} photo{selectedPhotos.length !== 1 ? "s" : ""} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#EDE7DD] transition-colors"
          >
            <X size={18} className="text-[#6B6B6B]" />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedPhotos.length === 0 ? (
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
                  className="relative group rounded-xl overflow-hidden aspect-square"
                >
                  <Image
                    src={photo.thumbnailUrl}
                    alt={photo.filename}
                    fill
                    className="object-cover"
                    unoptimized
                    sizes="120px"
                  />
                  {!isLocked && (
                    <button
                      onClick={() => onRemove(photo._id)}
                      className={cn(
                        "absolute inset-0 flex items-center justify-center",
                        "bg-[#2B2B2B]/0 group-hover:bg-[#2B2B2B]/40 transition-all duration-150"
                      )}
                    >
                      <div className="opacity-0 group-hover:opacity-100 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow transition-opacity">
                        <Trash2 size={14} className="text-red-500" />
                      </div>
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
