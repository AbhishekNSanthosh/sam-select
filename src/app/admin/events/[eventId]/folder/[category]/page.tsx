"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Trash2, ImageIcon, AlertCircle } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { IPhoto } from "@/types";

export default function AdminFolderPage() {
  const { eventId, category: encodedCategory } = useParams<{ eventId: string; category: string }>();
  const category = decodeURIComponent(encodedCategory);
  const router = useRouter();
  const { toast } = useToast();

  const [photos, setPhotos] = useState<IPhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<IPhoto | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/photos?eventId=${eventId}&category=${encodeURIComponent(category)}&page=1&limit=40`
        );
        const data = await res.json();
        if (data.success) {
          setPhotos(data.data.photos);
          setTotal(data.data.total);
          setPage(1);
          setHasMore(data.data.hasMore);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId, category]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting || loadingMoreRef.current || !hasMore) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        try {
          const nextPage = page + 1;
          const res = await fetch(
            `/api/photos?eventId=${eventId}&category=${encodeURIComponent(category)}&page=${nextPage}&limit=40`
          );
          const data = await res.json();
          if (data.success) {
            setPhotos((prev) => [...prev, ...data.data.photos]);
            setPage(nextPage);
            setHasMore(data.data.hasMore);
          }
        } finally {
          setLoadingMore(false);
          loadingMoreRef.current = false;
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, page, eventId, category]);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/categories?category=${encodeURIComponent(category)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Delete failed", "error");
      } else {
        toast(`Deleted ${data.data.deleted} photos`, "success");
        router.push(`/admin/events/${eventId}`);
      }
    } catch {
      toast("Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AdminPageHeader
        title={category}
        subtitle={loading ? "Loading…" : `${total} photos`}
        action={
          <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={14} /> Delete Folder
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        <Link
          href={`/admin/events/${eventId}`}
          className="inline-flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#2B2B2B] transition-colors"
        >
          <ArrowLeft size={15} /> Back to Event
        </Link>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-[#EDE7DD]">
            <div className="w-12 h-12 rounded-xl bg-[#F5EFE6] flex items-center justify-center mb-3">
              <ImageIcon size={22} className="text-[#B89B72]" />
            </div>
            <p className="font-display text-base text-[#2B2B2B]">No photos in this folder</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#EDE7DD] overflow-hidden p-4">
            <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3 space-y-3">
              {photos.map((photo) => (
                <div
                  key={photo._id}
                  className="relative break-inside-avoid rounded-xl overflow-hidden bg-[#EDE7DD] cursor-pointer group"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumbnailUrl.replace(/=s\d+$/, "=w600")}
                    alt={photo.filename}
                    loading="lazy"
                    className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                  {photo.isBlurry && (
                    <div
                      className="absolute top-2 right-2 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white shadow-sm"
                      title="Blurry"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
              ))}
            </div>
            <div ref={sentinelRef} className={hasMore ? "flex justify-center py-8" : "h-px"}>
              {loadingMore && <Spinner className="w-6 h-6 text-[#D6C3A3]" />}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title={`Delete "${category}"`}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              This will permanently delete all {total} photos in this folder. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" loading={deleting} onClick={handleDelete}>
              <Trash2 size={14} /> Delete {total} photos
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 md:p-8 backdrop-blur-sm transition-opacity"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedPhoto.fullUrl || selectedPhoto.thumbnailUrl.replace(/=s\d+(-\w+)?$/, "=s2048")}
            alt={selectedPhoto.filename}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-scale-in"
          />
          <button
            className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setSelectedPhoto(null); }}
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
