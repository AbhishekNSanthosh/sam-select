"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { LogOut, Heart, Folder } from "lucide-react";
import Logo from "@/components/layout/Logo";
import SelectionBar from "@/components/selection/SelectionBar";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import type { IEvent, IAlbum } from "@/types";
import type { CategorySummary } from "@/app/api/admin/events/[eventId]/categories/route";

export default function EventGalleryPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [event, setEvent] = useState<IEvent | null>(null);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [album, setAlbum] = useState<IAlbum | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedCount = album?.selectedPhotoIds?.length ?? 0;
  const isLocked = album?.status === "submitted" || album?.status === "approved";

  useEffect(() => {
    async function load() {
      try {
        const [evRes, catRes, selRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch(`/api/events/${eventId}/categories`),
          fetch("/api/selections"),
        ]);

        if (evRes.status === 401 || evRes.status === 403) {
          router.replace("/login");
          return;
        }

        const [evData, catData, selData] = await Promise.all([
          evRes.json(), catRes.json(), selRes.json(),
        ]);

        if (!evData.success) throw new Error("Failed to load event");
        setEvent(evData.data);
        if (catData.success) setCategories(catData.data);
        if (selData.success) setAlbum(selData.data);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId, router]);

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
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="w-8 h-8" />
          <p className="text-sm text-[#6B6B6B] font-display italic">Loading your gallery…</p>
        </div>
      </div>
    );
  }

  if (album?.status === "submitted" || album?.status === "approved") {
    return (
      <div className="min-h-screen bg-[#FBF9F6] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm w-full animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D6C3A3] to-[#B89B72] flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Heart size={32} className="text-white fill-white" />
          </div>
          <h1 className="font-display text-3xl text-[#2B2B2B] mb-3">Album Submitted!</h1>
          <p className="text-[#6B6B6B] leading-relaxed mb-2">Your album has been submitted 💛</p>
          <p className="text-[#6B6B6B] text-sm mb-8">
            Sam&apos;s Creations will review your {selectedCount} selected photos and create your perfect album.
          </p>
          <div className="bg-[#D6C3A3]/10 rounded-xl p-4 border border-[#D6C3A3]/20 mb-6">
            <p className="text-sm text-[#2B2B2B] font-medium">{event?.name}</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">{selectedCount} photos selected</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="w-full">Exit Gallery</Button>
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
            {isLocked && <Badge variant="green">Submitted</Badge>}
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

      <div className="max-w-7xl mx-auto px-4 pt-8 pb-4">
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
            {categories.map((cat) => (
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

      {/* Sticky selection bar */}
      <SelectionBar
        count={selectedCount}
        isLocked={isLocked}
        submitting={submitting}
        onViewSelection={() => {
          // Navigate to first folder to view selection
          if (categories.length > 0) {
            router.push(`/event/${eventId}/folder/${encodeURIComponent(categories[0].name)}`);
          }
        }}
        onSubmit={() => setConfirmOpen(true)}
      />

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
