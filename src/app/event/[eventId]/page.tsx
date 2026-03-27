"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { LogOut, Heart } from "lucide-react";
import Logo from "@/components/layout/Logo";
import MasonryGrid from "@/components/gallery/MasonryGrid";
import PhotoLightbox from "@/components/gallery/PhotoLightbox";
import SelectionBar from "@/components/selection/SelectionBar";
import SelectionDrawer from "@/components/selection/SelectionDrawer";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import { useSelection } from "@/hooks/useSelection";
import { useToast } from "@/components/ui/Toast";
import type { IPhoto, IEvent, IAlbum } from "@/types";

type PageStatus = "loading" | "ready" | "error" | "success";

export default function EventGalleryPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [status, setStatus] = useState<PageStatus>("loading");
  const [event, setEvent] = useState<IEvent | null>(null);
  const [photos, setPhotos] = useState<IPhoto[]>([]);
  const [album, setAlbum] = useState<IAlbum | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<IPhoto | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { selected, count, toggle, remove, isSelected, selectedArray, setSelected } =
    useSelection();

  const isLocked =
    album?.status === "submitted" || album?.status === "approved";

  // Load event, photos, and existing selection
  useEffect(() => {
    async function load() {
      try {
        const [evRes, phRes, selRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch(`/api/photos?eventId=${eventId}`),
          fetch("/api/selections"),
        ]);

        if (evRes.status === 401 || evRes.status === 403) {
          router.replace("/login");
          return;
        }

        const [evData, phData, selData] = await Promise.all([
          evRes.json(),
          phRes.json(),
          selRes.json(),
        ]);

        if (!evData.success) throw new Error("Failed to load event");

        setEvent(evData.data);
        setPhotos(phData.success ? phData.data : []);

        if (selData.success) {
          const al: IAlbum = selData.data;
          setAlbum(al);
          setSelected(new Set(al.selectedPhotoIds.map((id: string | { _id: string }) =>
            typeof id === "string" ? id : id._id
          )));
        }

        setStatus("ready");
      } catch {
        setStatus("error");
      }
    }
    load();
  }, [eventId, router, setSelected]);

  // Auto-save selection (debounced)
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
        setStatus("success");
      }
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#FBF9F6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="w-8 h-8" />
          <p className="text-sm text-[#6B6B6B] font-display italic">Loading your gallery…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#FBF9F6] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="font-display text-lg text-[#2B2B2B] mb-2">Oops! Something went wrong.</p>
          <p className="text-sm text-[#6B6B6B] mb-4">Please try again or contact Sam&apos;s Creations.</p>
          <Button onClick={() => router.push("/login")}>Go back</Button>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-[#FBF9F6] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm w-full animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D6C3A3] to-[#B89B72] flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Heart size={32} className="text-white fill-white" />
          </div>
          <h1 className="font-display text-3xl text-[#2B2B2B] mb-3">
            Album Submitted!
          </h1>
          <p className="text-[#6B6B6B] leading-relaxed mb-2">
            Your album has been submitted 💛
          </p>
          <p className="text-[#6B6B6B] text-sm mb-8">
            Sam&apos;s Creations will review your {count} selected photos and create your perfect album.
            We&apos;ll be in touch soon!
          </p>
          <div className="bg-[#D6C3A3]/10 rounded-xl p-4 border border-[#D6C3A3]/20 mb-6">
            <p className="text-sm text-[#2B2B2B] font-medium">{event?.name}</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">{count} photos selected</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="w-full">
            Exit Gallery
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F6]">
      {/* Header */}
      <header className="sticky top-0 z-20 glass border-b border-[#D6C3A3]/15">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            {isLocked && (
              <Badge variant="green">Submitted</Badge>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#2B2B2B] transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Event Hero */}
      <div className="max-w-7xl mx-auto px-4 pt-8 pb-4">
        <div className="mb-6 animate-fade-in">
          <p className="text-xs tracking-[0.2em] uppercase text-[#D6C3A3] mb-1">
            {event?.clientName}&apos;s Gallery
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-[#2B2B2B] mb-2">
            {event?.name}
          </h1>
          <p className="text-[#6B6B6B] text-sm">
            {photos.length} photos · {isLocked ? "Album submitted" : "Tap to select your favourites"}
            {event?.minSelection && !isLocked && ` · Minimum ${event.minSelection} photos`}
            {event?.maxSelection && !isLocked && `, maximum ${event.maxSelection}`}
          </p>
        </div>

        {/* Locked banner */}
        {isLocked && (
          <div className="bg-[#D6C3A3]/10 border border-[#D6C3A3]/25 rounded-xl p-4 mb-6 animate-fade-in flex items-center gap-3">
            <Heart size={18} className="text-[#D6C3A3] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#2B2B2B]">Your album has been submitted</p>
              <p className="text-xs text-[#6B6B6B]">
                {selectedArray.length} photos selected · Sam&apos;s Creations will be in touch soon.
              </p>
            </div>
          </div>
        )}

        {/* Gallery */}
        <MasonryGrid
          photos={photos}
          selected={selected}
          isLocked={isLocked}
          onToggle={handleToggle}
          onPreview={setPreviewPhoto}
        />

        {/* Bottom padding for sticky bar */}
        <div className="h-32" />
      </div>

      {/* Sticky selection bar */}
      <SelectionBar
        count={count}
        isLocked={isLocked}
        submitting={submitting}
        onViewSelection={() => setDrawerOpen(true)}
        onSubmit={() => setConfirmOpen(true)}
      />

      {/* Selection drawer */}
      <SelectionDrawer
        open={drawerOpen}
        photos={photos}
        selectedIds={selected}
        isLocked={isLocked}
        onClose={() => setDrawerOpen(false)}
        onRemove={handleRemove}
      />

      {/* Lightbox */}
      {previewPhoto && (
        <PhotoLightbox
          photo={previewPhoto}
          photos={photos}
          isSelected={isSelected(previewPhoto._id)}
          isLocked={isLocked}
          onClose={() => setPreviewPhoto(null)}
          onToggle={handleToggle}
          onNavigate={setPreviewPhoto}
        />
      )}

      {/* Submit confirmation modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Submit Your Album?"
      >
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
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmOpen(false)}
            >
              Go Back
            </Button>
            <Button
              variant="gold"
              className="flex-1"
              loading={submitting}
              onClick={handleSubmit}
            >
              Yes, Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
