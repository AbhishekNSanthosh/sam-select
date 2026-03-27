"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Users, X, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import BottomSheet from "@/components/ui/BottomSheet";
import MasonryGrid from "@/components/gallery/MasonryGrid";
import type { IPhoto } from "@/types";

interface Cluster {
  id: string;
  photoCount: number;
  photoIds: string[];
  representativePhoto: IPhoto;
}

interface Props {
  eventId: string;
  isLocked: boolean;
  selectedIds: Set<string>;
  allowDownload?: boolean;
  onSelectPhoto: (photo: IPhoto) => void;
  onTogglePhoto: (id: string) => void;
}

export default function PeopleSearch({
  eventId,
  isLocked,
  selectedIds,
  allowDownload,
  onSelectPhoto,
  onTogglePhoto,
}: Props) {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Sub-view state
  const [selectedPerson, setSelectedPerson] = useState<Cluster | null>(null);
  const [personPhotos, setPersonPhotos] = useState<IPhoto[]>([]);
  const [fetchingPhotos, setFetchingPhotos] = useState(false);

  const reset = () => {
    setSelectedPerson(null);
    setPersonPhotos([]);
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/events/${eventId}/people`);
        const json = await res.json();
        if (json.success) setClusters(json.data);
      } catch (e) {
        console.error("Failed to load people groups:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId]);

  if (loading || clusters.length === 0) return null;

  // The top 3 faces to show in the collapsed floating button
  const topClusters = clusters.slice(0, 3);
  const hasSelections = selectedIds.size > 0 && !isLocked;

  return (
    <>
      {/* Floating Action Button - Bottom Right */}
      <button
        onClick={() => setSheetOpen(true)}
        className={cn(
          "fixed right-4 sm:right-6 z-40 bg-white/90 backdrop-blur border border-[#EDE7DD] shadow-lg rounded-full pr-4 pl-2 py-2 flex items-center gap-3 hover:bg-white hover:border-[#D6C3A3] transition-all duration-300 ease-out group animate-fade-in",
          // On mobile, if SelectionBar is visible, float above it. Otherwise hover near bottom edge.
          hasSelections 
            ? "bottom-[calc(90px+env(safe-area-inset-bottom))] sm:bottom-6" 
            : "bottom-6 sm:bottom-6"
        )}
      >
        <div className="flex -space-x-2.5">
          {topClusters.map((c, i) => {
             const src = `/api/photos/proxy?url=${encodeURIComponent(c.representativePhoto.thumbnailUrl)}`;
             return (
               <div key={c.id} className="relative w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-[#F5F2EE]">
                 <img src={src} className="w-full h-full object-cover" alt="Person" />
               </div>
             )
          })}
          {clusters.length > 3 && (
            <div className="relative w-8 h-8 rounded-full border-2 border-white bg-[#D6C3A3] text-white flex items-center justify-center text-[10px] font-bold shadow-sm z-10">
              +{clusters.length - 3}
            </div>
          )}
        </div>
        <div className="flex flex-col items-start pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#2B2B2B]">People</span>
            <span className="bg-[#D6C3A3]/20 text-[#B89B72] text-[8px] px-1 md:px-1.5 py-[1px] md:py-0.5 rounded uppercase font-bold tracking-wider leading-none">Beta</span>
          </div>
          <span className="text-[10px] text-[#6B6B6B]">Smart Groups</span>
        </div>
      </button>

      {/* Expanded Sheet */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} maxWidth="sm:max-w-2xl">
        <div className="flex flex-col h-[75vh] sm:h-[70vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE7DD] shrink-0">
            {selectedPerson ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={reset}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-[#F5F2EE] hover:bg-[#EDE7DD] text-[#6B6B6B] transition-colors"
                >
                  <ChevronRight size={14} className="rotate-180" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full overflow-hidden border border-[#D6C3A3]/50 shrink-0">
                    <img src={`/api/photos/proxy?url=${encodeURIComponent(selectedPerson.representativePhoto.thumbnailUrl)}`} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-semibold text-[#2B2B2B]">
                    {selectedPerson.photoCount} photos
                  </h3>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Users size={16} className="text-[#B89B72]" />
                <h3 className="font-semibold text-[#2B2B2B] mr-1">Smart Groups</h3>
                <span className="bg-[#D6C3A3]/20 text-[#B89B72] text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                  BETA
                </span>
              </div>
            )}
            
            <button
              onClick={() => {
                setSheetOpen(false);
                setTimeout(reset, 300); // reset after animate out
              }}
              className="text-[#6B6B6B] hover:text-[#2B2B2B] transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
            {!selectedPerson ? (
              /* Grid of faces */
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {clusters.map((cluster) => {
                  const src = `/api/photos/proxy?url=${encodeURIComponent(cluster.representativePhoto.thumbnailUrl)}`;
                  return (
                    <button
                      key={cluster.id}
                      onClick={async () => {
                        setSelectedPerson(cluster);
                        setFetchingPhotos(true);
                        try {
                          // Fetch actual IPhoto objects via a batch endpoint
                          const res = await fetch("/api/photos/batch", {
                            method: "POST",
                            body: JSON.stringify({ photoIds: cluster.photoIds }),
                          });
                          const json = await res.json();
                          if (json.success) setPersonPhotos(json.data);
                        } catch(e) { console.error(e); }
                        setFetchingPhotos(false);
                      }}
                      className="flex flex-col items-center gap-2 group text-left"
                    >
                      <div className="w-[84px] h-[84px] overflow-hidden rounded-full border-2 border-[#EDE7DD] group-hover:border-[#D6C3A3] group-hover:shadow-md transition-all">
                        <img src={src} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="Person" />
                      </div>
                      <span className="text-[11px] font-medium text-[#6B6B6B] bg-[#F5F2EE] px-2 py-0.5 rounded-full group-hover:bg-[#D6C3A3]/20 group-hover:text-[#B89B72] transition-colors">
                        {cluster.photoCount} photos
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : fetchingPhotos ? (
              /* Loading person's photos */
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 size={24} className="text-[#D6C3A3] animate-spin" />
                <p className="text-sm text-[#6B6B6B]">Loading photos...</p>
              </div>
            ) : (
              /* Results grid */
              <MasonryGrid
                photos={personPhotos}
                selected={selectedIds}
                isLocked={isLocked}
                allowDownload={allowDownload}
                onToggle={onTogglePhoto}
                onPreview={(photo) => {
                  setSheetOpen(false);
                  onSelectPhoto(photo);
                }}
              />
            )}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
