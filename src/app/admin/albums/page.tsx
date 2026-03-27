"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle, AlertCircle, Unlock } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

interface PopulatedAlbum {
  _id: string;
  status: string;
  submittedAt?: string;
  adminNotes?: string;
  selectedPhotoIds: Array<{
    _id: string;
    thumbnailUrl: string;
    filename: string;
  }>;
  eventId: {
    _id: string;
    name: string;
    clientName: string;
    eventDate: string;
  };
}

export default function AdminAlbumsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [albums, setAlbums] = useState<PopulatedAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/albums")
      .then((r) => {
        if (r.status === 401) router.replace("/login");
        return r.json();
      })
      .then((d) => {
        if (d.success) setAlbums(d.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  async function handleAction(albumId: string, action: "approve" | "request_changes" | "unlock") {
    setActionLoading(`${albumId}-${action}`);
    try {
      const res = await fetch(`/api/admin/albums/${albumId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Action failed", "error");
      } else {
        setAlbums((prev) =>
          prev.map((a) => (a._id === albumId ? { ...a, status: data.data.status } : a))
        );
        toast(
          action === "approve" ? "Album approved!" :
          action === "request_changes" ? "Changes requested" : "Album unlocked",
          "success"
        );
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="min-h-screen">
      <AdminPageHeader
        title="Submitted Albums"
        subtitle="Review and approve client photo selections"
      />

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="w-8 h-8" />
          </div>
        ) : albums.length === 0 ? (
          <div className="bg-white rounded-2xl card-shadow p-12 text-center">
            <p className="font-display text-lg text-[#2B2B2B] mb-1">No albums submitted yet</p>
            <p className="text-sm text-[#6B6B6B]">Albums will appear here once clients submit their selections.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {albums.map((album) => (
              <div key={album._id} className="bg-white rounded-2xl card-shadow overflow-hidden">
                {/* Album header */}
                <div className="px-6 py-5 border-b border-[#EDE7DD] flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs tracking-[0.15em] uppercase text-[#D6C3A3] mb-0.5">
                      {album.eventId?.clientName}
                    </p>
                    <h2 className="font-display text-xl text-[#2B2B2B]">{album.eventId?.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-[#6B6B6B]">
                        {album.selectedPhotoIds?.length ?? 0} photos selected
                      </span>
                      {album.submittedAt && (
                        <span className="text-xs text-[#6B6B6B]">
                          · Submitted {new Date(album.submittedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        album.status === "approved" ? "green" :
                        album.status === "submitted" ? "gold" :
                        album.status === "changes_requested" ? "amber" : "gray"
                      }
                    >
                      {album.status.replace("_", " ")}
                    </Badge>
                    <Link
                      href={`/admin/events/${album.eventId?._id}`}
                      className="text-xs text-[#D6C3A3] hover:underline"
                    >
                      View event →
                    </Link>
                  </div>
                </div>

                {/* Photo thumbnails */}
                <div className="p-4">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {album.selectedPhotoIds?.slice(0, 20).map((photo) => (
                      <div
                        key={photo._id}
                        className="w-20 h-20 rounded-lg overflow-hidden bg-[#EDE7DD] shrink-0"
                      >
                        <Image
                          src={photo.thumbnailUrl}
                          alt={photo.filename ?? ""}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      </div>
                    ))}
                    {album.selectedPhotoIds?.length > 20 && (
                      <div className="w-20 h-20 rounded-lg bg-[#EDE7DD] shrink-0 flex items-center justify-center">
                        <span className="text-xs text-[#6B6B6B] font-medium">
                          +{album.selectedPhotoIds.length - 20}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {album.status === "submitted" && (
                  <div className="px-6 pb-5 flex gap-3 flex-wrap">
                    <Button
                      size="sm"
                      variant="gold"
                      loading={actionLoading === `${album._id}-approve`}
                      onClick={() => handleAction(album._id, "approve")}
                    >
                      <CheckCircle size={14} /> Approve Album
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={actionLoading === `${album._id}-request_changes`}
                      onClick={() => handleAction(album._id, "request_changes")}
                    >
                      <AlertCircle size={14} /> Request Changes
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={actionLoading === `${album._id}-unlock`}
                      onClick={() => handleAction(album._id, "unlock")}
                    >
                      <Unlock size={14} /> Unlock
                    </Button>
                  </div>
                )}
                {album.status !== "submitted" && (
                  <div className="px-6 pb-5">
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={actionLoading === `${album._id}-unlock`}
                      onClick={() => handleAction(album._id, "unlock")}
                    >
                      <Unlock size={14} /> Unlock Album
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

