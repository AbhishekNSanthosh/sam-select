"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Heart, Search, X, ScanFace } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Logo from "@/components/layout/Logo";
import MasonryGrid from "@/components/gallery/MasonryGrid";
import PhotoLightbox from "@/components/gallery/PhotoLightbox";
import SelfieSearch from "@/components/gallery/SelfieSearch";
import BottomSheet from "@/components/ui/BottomSheet";
import SelectionBar from "@/components/selection/SelectionBar";
import SelectionDrawer from "@/components/selection/SelectionDrawer";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { useSelection } from "@/hooks/useSelection";
import { useToast } from "@/components/ui/Toast";
import type { IPhoto, IEvent, IAlbum } from "@/types";

export default function EventFolderPage() {
  const { eventId, category: encodedCategory } = useParams<{ eventId: string; category: string }>();
  const category = decodeURIComponent(encodedCategory);
  const router = useRouter();
  const { toast } = useToast();

  const [event, setEvent] = useState<IEvent | null>(null);
  const [photos, setPhotos] = useState<IPhoto[]>([]);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [photosPage, setPhotosPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [album, setAlbum] = useState<IAlbum | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewPhoto, setPreviewPhoto] = useState<IPhoto | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selfieOpen, setSelfieOpen] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  const { selected, count, toggle, remove, isSelected, setSelected } = useSelection();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Search Results Cache
  const searchCacheRef = useRef<Record<string, { photos: IPhoto[], total: number, hasMore: boolean }>>({});

  const isLocked = album?.status === "approved" || event?.status === "locked";

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 1. Load Event & Selections (Once)
  useEffect(() => {
    async function init() {
      try {
        const [evRes, selRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch("/api/selections"),
        ]);

        if (evRes.status === 401 || evRes.status === 403) {
          setAuthFailed(true);
          window.location.href = `/api/auth/event-login?eventId=${eventId}`;
          return;
        }

        const [evData, selData] = await Promise.all([evRes.json(), selRes.json()]);

        if (!evData.success) throw new Error();
        setEvent(evData.data);

        if (selData.success) {
          const al: IAlbum = selData.data;
          setAlbum(al);
          setSelected(new Set(al.selectedPhotoIds.map((id: string | { _id: string }) =>
            typeof id === "string" ? id : id._id
          )));
        }
      } catch {
        setAuthFailed(true);
        window.location.href = `/api/auth/event-login?eventId=${eventId}`;
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [eventId, router, setSelected]);

  // 2. Load Photos based on debounced search (Cached)
  useEffect(() => {
    async function loadPhotos() {
        // Stop if not auth'd or event not loaded
        if (loading || authFailed) return;

        // Cache Hit
        if (searchCacheRef.current[debouncedSearch]) {
          const cached = searchCacheRef.current[debouncedSearch];
          setPhotos(cached.photos);
          setTotalPhotos(cached.total);
          setPhotosPage(1);
          setHasMore(cached.hasMore);
          return;
        }

        setIsSearching(true);
        try {
          const phRes = await fetch(`/api/photos?eventId=${eventId}&category=${encodeURIComponent(category)}&page=1&limit=40&search=${encodeURIComponent(debouncedSearch)}`);
          const phData = await phRes.json();

          if (phData.success) {
            setPhotos(phData.data.photos);
            setTotalPhotos(phData.data.total);
            setPhotosPage(1);
            setHasMore(phData.data.hasMore);
            
            // Save to cache
            searchCacheRef.current[debouncedSearch] = {
               photos: phData.data.photos,
               total: phData.data.total,
               hasMore: phData.data.hasMore
            };
          }
        } finally {
          setIsSearching(false);
        }
    }
    
    loadPhotos();
  }, [eventId, category, debouncedSearch, loading, authFailed]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting || loadingMoreRef.current || !hasMore) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        try {
          const nextPage = photosPage + 1;
          const res = await fetch(
            `/api/photos?eventId=${eventId}&category=${encodeURIComponent(category)}&page=${nextPage}&limit=40&search=${encodeURIComponent(debouncedSearch)}`
          );
          const data = await res.json();
          if (data.success) {
            setPhotos((prev) => [...prev, ...data.data.photos]);
            setPhotosPage(nextPage);
            setHasMore(data.data.hasMore);
          }
        } finally {
          setLoadingMore(false);
          loadingMoreRef.current = false;
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, photosPage, eventId, category, debouncedSearch]);

  const saveSelection = useCallback(
    (ids: string[]) => {
      if (isLocked) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await fetch("/api/selections", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedPhotoIds: ids }),
        });
      }, 1200);
    },
    [isLocked]
  );

  function handleToggle(id: string) {
    if (isLocked) return;
    toggle(id);
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    saveSelection(Array.from(next));
  }

  function handleRemove(id: string) {
    if (isLocked) return;
    remove(id);
    const next = new Set(selected);
    next.delete(id);
    saveSelection(Array.from(next));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/selections/submit", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Submission failed", "error");
      } else {
        setAlbum((prev) => prev ? { ...prev, status: "submitted" } : prev);
        setConfirmOpen(false);
      }
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(event?.shareToken ? `/g/${event.shareToken}` : "/login");
  }

  // Staggered heights to mimic masonry
  const skeletonHeights = [260, 200, 320, 180, 280, 220, 300, 190, 240, 310, 200, 260];

  if (authFailed) {
    return (
      <div className="min-h-screen bg-[#FBF9F6] flex flex-col items-center justify-center animate-fade-in">
        <Logo className="mb-6 scale-110" />
        <div className="flex gap-1.5 items-center">
          <div className="w-2 h-2 rounded-full bg-[#D6C3A3] animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-[#D6C3A3] animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-[#D6C3A3] animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F6]">
        {/* Skeleton header */}
        <header className="sticky top-0 z-20 glass border-b border-[#D6C3A3]/15">
          <div className="px-[5vw] py-3 flex items-center justify-between">
            <div className="skeleton h-7 w-36 rounded-lg" />
            <div className="skeleton h-6 w-12 rounded-lg" />
          </div>
        </header>

        <div className="px-[5vw] pt-6 pb-4">
          {/* Skeleton back link */}
          <div className="skeleton h-4 w-24 rounded-full mb-6" />

          {/* Skeleton hero */}
          <div className="mb-6 space-y-3">
            <div className="skeleton h-3 w-28 rounded-full" />
            <div className="skeleton h-9 w-52 rounded-xl" />
            <div className="skeleton h-4 w-40 rounded-full" />
          </div>

          {/* Skeleton masonry — 2 cols mobile, 3 cols sm, 4 cols lg */}
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((col) => (
              <div key={col} className={`flex-1 flex flex-col gap-3 ${col >= 2 ? "hidden sm:flex" : ""} ${col === 3 ? "!hidden lg:!flex" : ""}`}>
                {skeletonHeights
                  .filter((_, i) => i % 4 === col)
                  .map((h, i) => (
                    <div
                      key={i}
                      className="skeleton w-full rounded-xl"
                      style={{ height: h }}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#FBF9F6]">
      {/* Header */}
      <header className="sticky top-0 z-20 glass border-b border-[#D6C3A3]/15">
        <div className="px-[5vw] py-3 flex items-center justify-between">
          <Logo />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#2B2B2B] transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      <div className="px-[5vw] pt-6 pb-4">
        {/* Back */}
        <button
          onClick={() => router.push(`/event/${eventId}`)}
          className="inline-flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#2B2B2B] transition-colors mb-6"
        >
          <ArrowLeft size={15} /> All Folders
        </button>

        {/* Hero & Search */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in relative z-10">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-[#D6C3A3] mb-1">
              {event?.clientName}&apos;s Gallery
            </p>
            <h1 className="font-display text-3xl sm:text-4xl text-[#2B2B2B] mb-2">{category}</h1>
            <p className="text-[#6B6B6B] text-sm">
              {totalPhotos} photos · {isLocked ? "Album submitted" : "Tap to select your favourites"}
            </p>
          </div>
          
          {/* Search bar + Selfie icon */}
          <div className="relative w-full md:w-72 shrink-0 shadow-sm border border-[#EDE7DD] rounded-full bg-white flex items-center px-4 overflow-hidden focus-within:border-[#D6C3A3] focus-within:ring-2 focus-within:ring-[#D6C3A3]/20 transition-all">
            {isSearching ? (
              <Spinner className="w-4 h-4 text-[#B89B72]" />
            ) : (
              <Search size={16} className="text-[#B89B72] shrink-0" />
            )}
            <input
              type="text"
              placeholder="Search by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 w-full outline-none bg-transparent border-none focus:ring-0 text-sm py-2.5 px-3 mb-0 placeholder:text-[#6B6B6B]"
            />
            {searchQuery && !isSearching && (
              <button onClick={() => setSearchQuery("")} className="text-[#6B6B6B] hover:text-[#2B2B2B] mr-1">
                <X size={14} />
              </button>
            )}
            {/* Divider */}
            <div className="w-px h-4 bg-[#EDE7DD] mx-1 shrink-0" />
            {/* Selfie search button */}
            <button
              onClick={() => setSelfieOpen(true)}
              title="Find My Photos"
              className="flex items-center gap-1.5 text-[#6B6B6B] hover:text-[#B89B72] transition-colors shrink-0 py-1 pl-1"
            >
              <ScanFace size={16} />
              <span className="hidden sm:inline text-xs font-medium pr-1">Selfie</span>
            </button>
          </div>
        </div>

        {isLocked && (
          <div className="bg-[#D6C3A3]/10 border border-[#D6C3A3]/25 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Heart size={18} className="text-[#D6C3A3] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#2B2B2B]">Your album has been submitted</p>
              <p className="text-xs text-[#6B6B6B]">{count} photos selected · Sam&apos;s Creations will be in touch soon.</p>
            </div>
          </div>
        )}

        <div className={cn("transition-opacity duration-300", isSearching ? "opacity-50 pointer-events-none" : "opacity-100")}>
          <MasonryGrid
            photos={photos}
            selected={selected}
            isLocked={isLocked}
            allowDownload={event?.allowDownload}
            onToggle={handleToggle}
            onPreview={setPreviewPhoto}
          />
        </div>

        <div ref={sentinelRef} className="flex justify-center py-8">
          {loadingMore && <Spinner className="w-6 h-6" />}
        </div>

        <div className="h-32" />
      </div>

      <SelectionBar
        count={count}
        isLocked={isLocked}
        submitting={submitting}
        isSubmitted={album?.status === "submitted"}
        onViewSelection={() => setDrawerOpen(true)}
        onSubmit={() => setConfirmOpen(true)}
      />

      {/* Selfie Search sheet */}
      <BottomSheet open={selfieOpen} onClose={() => setSelfieOpen(false)}>
        <SelfieSearch
          eventId={eventId}
          isLocked={isLocked}
          allowDownload={event?.allowDownload}
          selectedIds={selected}
          onSelectPhoto={(photo) => { setPreviewPhoto(photo); setSelfieOpen(false); }}
          onTogglePhoto={handleToggle}
          onClose={() => setSelfieOpen(false)}
        />
      </BottomSheet>
      <SelectionDrawer
        open={drawerOpen}
        selectedIds={selected}
        isLocked={isLocked}
        onClose={() => setDrawerOpen(false)}
        onRemove={handleRemove}
        onPreview={setPreviewPhoto}
      />

      {previewPhoto && (
        <PhotoLightbox
          photo={previewPhoto}
          photos={photos}
          totalPhotos={totalPhotos}
          isSelected={isSelected(previewPhoto._id)}
          isLocked={isLocked}
          allowDownload={event?.allowDownload}
          onClose={() => setPreviewPhoto(null)}
          onToggle={handleToggle}
          onNavigate={setPreviewPhoto}
        />
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Submit Your Album?">
        <div className="space-y-4">
          <p className="text-[#6B6B6B] text-sm leading-relaxed">
            You&apos;re about to submit <strong className="text-[#2B2B2B]">{count} photos</strong> for
            your album. Once submitted, your selection will be locked.
          </p>
          <div className="bg-[#FBF9F6] rounded-xl p-4 border border-[#EDE7DD]">
            <p className="text-sm font-medium text-[#2B2B2B]">{event?.name}</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">{count} photos selected</p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>
              Go Back
            </Button>
            <Button variant="gold" className="flex-1" loading={submitting} onClick={handleSubmit}>
              Yes, Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
