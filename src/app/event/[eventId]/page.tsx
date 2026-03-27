"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { LogOut, Folder, ScanFace } from "lucide-react";
import Logo from "@/components/layout/Logo";
import SelectionBar from "@/components/selection/SelectionBar";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import SelectionDrawer from "@/components/selection/SelectionDrawer";
import PhotoLightbox from "@/components/gallery/PhotoLightbox";
import { useSelection } from "@/hooks/useSelection";
import SelfieSearch from "@/components/gallery/SelfieSearch";
import BottomSheet from "@/components/ui/BottomSheet";
import type { IEvent, IAlbum, IPhoto } from "@/types";
import type { CategorySummary } from "@/app/api/admin/events/[eventId]/categories/route";

export default function EventGalleryPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [event, setEvent] = useState<IEvent | null>(null);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [album, setAlbum] = useState<IAlbum | null>(null);
  const [loading, setLoading] = useState(true);
  const [authFailed, setAuthFailed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { selected, count: selectedCount, toggle, remove, isSelected, setSelected } = useSelection();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selfieOpen, setSelfieOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<IPhoto | null>(null);
  const isLocked = album?.status === "approved" || event?.status === "locked";

  useEffect(() => {
    async function load() {
      try {
        const [evRes, catRes, selRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch(`/api/events/${eventId}/categories`),
          fetch("/api/selections"),
        ]);

        if (evRes.status === 401 || evRes.status === 403) {
          setAuthFailed(true);
          window.location.href = `/api/auth/event-login?eventId=${eventId}`;
          return;
        }

        const [evData, catData, selData] = await Promise.all([
          evRes.json(), catRes.json(), selRes.json(),
        ]);

        if (!evData.success) throw new Error("Failed to load event");
        setEvent(evData.data);
        if (catData.success) setCategories(catData.data);
        if (selData.success) {
          setAlbum(selData.data);
          setSelected(new Set(selData.data.selectedPhotoIds.map((id: string | { _id: string }) =>
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
    load();
  }, [eventId, router, setSelected]);

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

  function handleRemove(id: string) {
    if (isLocked) return;
    remove(id);
    const next = new Set(selected);
    next.delete(id);
    saveSelection(Array.from(next));
  }

  function handleToggle(id: string) {
    if (isLocked) return;
    toggle(id);
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
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
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(event?.shareToken ? `/g/${event.shareToken}` : "/login");
  }

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
            <div className="skeleton h-6 w-16 rounded-lg" />
          </div>
        </header>

        <div className="px-[5vw] pt-8 pb-4">
          {/* Skeleton hero */}
          <div className="mb-8 space-y-3">
            <div className="skeleton h-3 w-28 rounded-full" />
            <div className="skeleton h-9 w-64 rounded-xl" />
            <div className="skeleton h-4 w-48 rounded-full" />
          </div>

          {/* Skeleton folder grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton rounded-2xl aspect-video" />
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
          <div className="flex items-center gap-3">
            {isLocked && <Badge variant="green">Submitted</Badge>}
            {/* Selfie search icon */}
            <button
              onClick={() => setSelfieOpen(true)}
              title="Find My Photos"
              className="flex items-center gap-1.5 text-[#6B6B6B] hover:text-[#2B2B2B] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#EDE7DD]"
            >
              <ScanFace size={16} />
              <span className="hidden sm:inline text-sm">Search with Selfie</span>
            </button>
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

      <div className="px-[5vw] pt-8 pb-4">
        {/* Hero */}
        <div className="mb-8 animate-fade-in">
          <p className="text-xs tracking-[0.2em] uppercase text-[#D6C3A3] mb-1">
            {event?.clientName}&apos;s Gallery
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-[#2B2B2B] mb-2">{event?.name}</h1>
          <p className="text-[#6B6B6B] text-sm">
            {categories.reduce((s, c) => s + c.count, 0)} photos ·{" "}
            {isLocked ? "Album submitted" : "Choose a folder to start selecting"}
            {event?.minSelection && !isLocked && ` · Minimum ${event.minSelection} photos`}
            {event?.maxSelection && !isLocked && `, maximum ${event.maxSelection}`}
          </p>
        </div>

        {/* Folder grid */}
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Folder size={36} className="text-[#D6C3A3] mb-4" />
            <p className="font-display text-lg text-[#2B2B2B] mb-1">No photos yet</p>
            <p className="text-sm text-[#6B6B6B]">Check back soon — Sam is uploading your photos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {categories.map((cat, i) => (
              <button
                key={cat.name}
                onClick={() => router.push(`/event/${eventId}/folder/${encodeURIComponent(cat.name)}`)}
                className="group relative rounded-2xl overflow-hidden aspect-video bg-[#EDE7DD] text-left hover:ring-2 hover:ring-[#D6C3A3] transition-all shadow-sm hover:shadow-md"
              >
                {cat.cover && (
                  <Image
                    src={cat.cover.replace(/=s\d+$/, "=s600")}
                    alt={cat.name}
                    fill
                    priority={i < 4}
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    unoptimized
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white font-display text-lg truncate">{cat.name}</p>
                  <p className="text-white/70 text-sm">{cat.count} photos</p>
                </div>
              </button>
            ))}
          </div>
        )}



        <div className="h-32" />
      </div>

      <SelectionBar
        count={selectedCount}
        isLocked={isLocked}
        submitting={submitting}
        isSubmitted={album?.status === "submitted"}
        onViewSelection={() => setDrawerOpen(true)}
        onSubmit={() => setConfirmOpen(true)}
      />

      {/* Selfie Search modal sheet */}
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
          photos={[previewPhoto]}
          totalPhotos={1}
          isSelected={isSelected(previewPhoto._id)}
          isLocked={isLocked}
          allowDownload={event?.allowDownload}
          onClose={() => setPreviewPhoto(null)}
          onToggle={handleToggle}
          onNavigate={setPreviewPhoto}
        />
      )}

      {/* Submit confirmation modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Submit Your Album?">
        <div className="space-y-4">
          <p className="text-[#6B6B6B] text-sm leading-relaxed">
            You&apos;re about to submit <strong className="text-[#2B2B2B]">{selectedCount} photos</strong> for
            your album. Once submitted, your selection will be locked.
          </p>
          <div className="bg-[#FBF9F6] rounded-xl p-4 border border-[#EDE7DD]">
            <p className="text-sm font-medium text-[#2B2B2B]">{event?.name}</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">{selectedCount} photos selected</p>
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
