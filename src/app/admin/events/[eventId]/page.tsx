"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  RefreshCw,
  Upload,
  Folder,
  ImageIcon,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { IEvent, IPhoto, IAlbum } from "@/types";

export default function AdminEventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [event, setEvent] = useState<IEvent | null>(null);
  const [photos, setPhotos] = useState<IPhoto[]>([]);
  const [album, setAlbum] = useState<IAlbum | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncOpen, setSyncOpen] = useState(false);
  const [folderId, setFolderId] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [evRes, phRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch(`/api/photos?eventId=${eventId}`),
        ]);
        const [evData, phData] = await Promise.all([evRes.json(), phRes.json()]);
        if (!evData.success) { router.push("/admin"); return; }
        setEvent(evData.data);
        setPhotos(phData.success ? phData.data : []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId, router]);

  useEffect(() => {
    if (!event) return;
    fetch("/api/admin/albums")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const found = d.data.find(
            (a: IAlbum & { eventId: { _id: string } }) =>
              a.eventId?._id === eventId || a.eventId === eventId
          );
          if (found) setAlbum(found);
        }
      });
  }, [event, eventId]);

  async function handleSync() {
    if (!folderId.trim()) { toast("Please enter a Google Drive folder ID", "error"); return; }
    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/sync-drive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: folderId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Sync failed", "error");
      } else {
        toast(`Synced ${data.data.synced} new photos (${data.data.total} total)`, "success");
        setSyncOpen(false);
        const phRes = await fetch(`/api/photos?eventId=${eventId}`);
        const phData = await phRes.json();
        if (phData.success) setPhotos(phData.data);
      }
    } catch {
      toast("Sync failed. Check your Drive folder ID.", "error");
    } finally {
      setSyncing(false);
    }
  }

  async function handleAlbumAction(action: "approve" | "request_changes" | "unlock") {
    if (!album) return;
    setActionLoading(action);
    try {
      const res = await fetch(`/api/admin/albums/${album._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Action failed", "error");
      } else {
        setAlbum(data.data);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AdminPageHeader
        title={event?.name ?? "Event"}
        subtitle={event?.clientName}
        action={
          <div className="flex items-center gap-3">
            <Badge variant={event?.status === "active" ? "green" : event?.status === "locked" ? "gold" : "gray"}>
              {event?.status}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => setSyncOpen(true)}>
              <RefreshCw size={14} /> Sync Drive
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Back */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#2B2B2B] transition-colors"
        >
          <ArrowLeft size={15} /> Back to Dashboard
        </Link>

        {/* Event meta */}
        <div className="bg-white rounded-2xl card-shadow p-5 flex items-center gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D6C3A3]/20 to-[#B89B72]/20 flex items-center justify-center shrink-0">
            <ImageIcon size={20} className="text-[#D6C3A3]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-lg text-[#2B2B2B]">{event?.name}</p>
            <p className="text-sm text-[#6B6B6B]">
              {new Date(event?.eventDate ?? "").toLocaleDateString("en-IN", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Photos", value: photos.length, icon: <ImageIcon size={16} />, color: "text-[#D6C3A3]", bg: "bg-[#D6C3A3]/10" },
            { label: "Selected", value: album?.selectedPhotoIds?.length ?? 0, icon: <CheckCircle size={16} />, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Album Status", value: album?.status ?? "—", icon: <Folder size={16} />, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Blurry Photos", value: photos.filter((p) => p.isBlurry).length, icon: <AlertCircle size={16} />, color: "text-amber-600", bg: "bg-amber-50" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl card-shadow p-4">
              <div className={`w-8 h-8 rounded-lg ${s.bg} ${s.color} flex items-center justify-center mb-2`}>
                {s.icon}
              </div>
              <p className="font-display text-xl text-[#2B2B2B]">{s.value}</p>
              <p className="text-xs text-[#6B6B6B] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Album review card */}
        {album && (
          <div className="bg-white rounded-2xl card-shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EDE7DD] flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-display text-lg text-[#2B2B2B]">Album Review</h2>
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
                {album.submittedAt && (
                  <span className="text-xs text-[#6B6B6B]">
                    Submitted {new Date(album.submittedAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-6 py-4 flex gap-3 flex-wrap border-b border-[#EDE7DD]">
              {album.status === "submitted" && (
                <>
                  <Button size="sm" variant="gold" loading={actionLoading === "approve"} onClick={() => handleAlbumAction("approve")}>
                    <CheckCircle size={14} /> Approve Album
                  </Button>
                  <Button size="sm" variant="outline" loading={actionLoading === "request_changes"} onClick={() => handleAlbumAction("request_changes")}>
                    Request Changes
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" loading={actionLoading === "unlock"} onClick={() => handleAlbumAction("unlock")}>
                Unlock Album
              </Button>
            </div>

            {/* Selected photos */}
            {album.selectedPhotoIds && album.selectedPhotoIds.length > 0 && (
              <div className="p-4">
                <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-[0.15em] mb-3">
                  Selected Photos ({album.selectedPhotoIds.length})
                </p>
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                  {(album.selectedPhotoIds as unknown as IPhoto[]).map((photo) => (
                    <div key={typeof photo === "string" ? photo : photo._id} className="aspect-square rounded-lg overflow-hidden bg-[#EDE7DD]">
                      {typeof photo !== "string" && photo.thumbnailUrl && (
                        <Image src={photo.thumbnailUrl} alt={photo.filename ?? ""} width={80} height={80} className="w-full h-full object-cover" unoptimized />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* All photos grid */}
        <div className="bg-white rounded-2xl card-shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EDE7DD] flex items-center justify-between">
            <h2 className="font-display text-lg text-[#2B2B2B]">All Photos</h2>
            <span className="text-sm text-[#6B6B6B]">{photos.length} photos</span>
          </div>
          {photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Upload size={28} className="text-[#D6C3A3] mb-3" />
              <p className="font-display text-base text-[#2B2B2B] mb-1">No photos yet</p>
              <p className="text-sm text-[#6B6B6B] mb-4">Sync from Google Drive to add photos.</p>
              <Button size="sm" onClick={() => setSyncOpen(true)}>
                <RefreshCw size={14} /> Sync Drive
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-4">
              {photos.map((photo) => (
                <div key={photo._id} className="relative aspect-square rounded-xl overflow-hidden bg-[#EDE7DD]">
                  <Image src={photo.thumbnailUrl} alt={photo.filename} fill className="object-cover" unoptimized sizes="100px" />
                  {photo.isBlurry && (
                    <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white" title="Blurry" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sync Drive modal */}
      <Modal open={syncOpen} onClose={() => setSyncOpen(false)} title="Sync from Google Drive">
        <div className="space-y-4">
          <p className="text-sm text-[#6B6B6B]">
            Enter the Google Drive folder ID containing the event photos. All images will be synced automatically.
          </p>
          <Input
            label="Google Drive Folder ID"
            placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
          />
          <p className="text-xs text-[#6B6B6B]">
            Find the folder ID in the URL: drive.google.com/drive/folders/<strong>FOLDER_ID</strong>
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setSyncOpen(false)}>Cancel</Button>
            <Button className="flex-1" loading={syncing} onClick={handleSync}>
              <RefreshCw size={14} /> Sync Photos
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
