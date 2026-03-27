"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
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
  Share2,
  Copy,
  Check,
  Settings,
  Trash2,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import FaceScanner from "@/components/admin/FaceScanner";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";
import type { IEvent, IPhoto, IAlbum } from "@/types";
import type { CategorySummary } from "@/app/api/admin/events/[eventId]/categories/route";

export default function AdminEventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  const { toast } = useToast();
  const networkStatus = useNetworkStatus();

  const [event, setEvent] = useState<IEvent | null>(null);
  const [album, setAlbum] = useState<IAlbum | null>(null);
  const [loading, setLoading] = useState(true);

  // Category state
  const [categories, setCategories] = useState<CategorySummary[]>([]);

  // Modals
  const [syncOpen, setSyncOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Edit event form
  const [editForm, setEditForm] = useState({
    name: "",
    clientName: "",
    eventDate: "",
    pin: "",
    description: "",
    status: "active" as "active" | "locked" | "archived",
    minSelection: "",
    maxSelection: "",
    allowDownload: false,
  });
  const [saving, setSaving] = useState(false);

  // Share
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Sync
  const [folderId, setFolderId] = useState("");
  const [folderName, setFolderName] = useState<string | null>(null);
  const [fetchingFolder, setFetchingFolder] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Upload
  const [uploadCategory, setUploadCategory] = useState("General");
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [removeBlurry, setRemoveBlurry] = useState(true);
  const [uploadDriveFolderId, setUploadDriveFolderId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ uploaded: 0, skipped: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Album
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: "all" | "category"; category?: string; count: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── helpers ──────────────────────────────────────────────────────────
  function getGalleryUrl(ev: IEvent) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return ev.shareToken ? `${origin}/g/${ev.shareToken}` : "";
  }

  function buildShareMessage(ev: IEvent) {
    const galleryUrl = getGalleryUrl(ev);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (galleryUrl) {
      return `Hi ${ev.clientName}!\n\nYour photos from *${ev.name}* are ready for selection on Sam's Creations.\n\n👉 Click your personal gallery link:\n${galleryUrl}\n\nBrowse your gallery and select your favourite photos for your album. Feel free to reach out if you need any help!\n\n— Sam's Creations`;
    }
    return `Hi ${ev.clientName}!\n\nYour photos from *${ev.name}* are ready for selection on Sam's Creations.\n\n👉 Visit: ${origin}/login\n🔑 Your PIN: ${ev.pin}\n\nBrowse your gallery and select your favourite photos for your album. Feel free to reach out if you need any help!\n\n— Sam's Creations`;
  }

  async function refreshCategories() {
    const res = await fetch(`/api/admin/events/${eventId}/categories`);
    const data = await res.json();
    if (data.success) setCategories(data.data);
  }

  // ── initial load ──────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [evRes, catRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch(`/api/admin/events/${eventId}/categories`),
        ]);
        const [evData, catData] = await Promise.all([evRes.json(), catRes.json()]);
        if (!evData.success) { router.push("/admin"); return; }
        setEvent(evData.data);
        if (catData.success) setCategories(catData.data);
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

  // ── share ─────────────────────────────────────────────────────────────
  async function handleCopy() {
    if (!event) return;
    await navigator.clipboard.writeText(buildShareMessage(event));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopyUrl() {
    if (!event) return;
    await navigator.clipboard.writeText(getGalleryUrl(event));
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  async function handleRegenerateToken() {
    if (!event) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "PATCH" });
      const data = await res.json();
      if (res.ok) {
        setEvent((prev) => prev ? { ...prev, shareToken: data.data.shareToken } : prev);
        toast("Gallery link regenerated", "success");
      } else {
        toast(data.error ?? "Failed to regenerate link", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setRegenerating(false);
    }
  }

  // ── sync drive ────────────────────────────────────────────────────────
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
        await refreshCategories();
      }
    } catch {
      toast("Sync failed. Check your Drive folder ID.", "error");
    } finally {
      setSyncing(false);
    }
  }

  // ── delete photos ─────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      let res: Response;
      if (deleteTarget.type === "all") {
        res = await fetch(`/api/admin/events/${eventId}/photos`, { method: "DELETE" });
      } else {
        res = await fetch(
          `/api/admin/events/${eventId}/categories?category=${encodeURIComponent(deleteTarget.category!)}`,
          { method: "DELETE" }
        );
      }
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Delete failed", "error");
      } else {
        toast(`Deleted ${data.data.deleted} photo${data.data.deleted !== 1 ? "s" : ""}`, "success");
        setDeleteTarget(null);
        await refreshCategories();
      }
    } catch {
      toast("Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  }

  // ── folder name lookup (debounced) ────────────────────────────────────
  useEffect(() => {
    const id = folderId.trim();
    if (!id) { setFolderName(null); return; }

    const timer = setTimeout(async () => {
      setFetchingFolder(true);
      setFolderName(null);
      try {
        const res = await fetch(`/api/admin/events/${eventId}/sync-drive?folderId=${encodeURIComponent(id)}`);
        const data = await res.json();
        setFolderName(res.ok ? data.data.name : null);
      } catch {
        setFolderName(null);
      } finally {
        setFetchingFolder(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [folderId, eventId]);

  // ── upload ────────────────────────────────────────────────────────────
  async function handleUpload(files: FileList) {
    if (!files.length) return;
    const category = newCategoryInput.trim() || uploadCategory;
    setUploading(true);
    setUploadProgress({ uploaded: 0, skipped: 0, total: files.length });

    const BATCH = 5;
    let totalUploaded = 0;
    let totalSkipped = 0;
    const allFiles = Array.from(files);

    for (let i = 0; i < allFiles.length; i += BATCH) {
      const batch = allFiles.slice(i, i + BATCH);
      const fd = new FormData();
      batch.forEach((f) => fd.append("files", f));
      fd.append("category", category);
      fd.append("removeBlurry", String(removeBlurry));
      if (uploadDriveFolderId.trim()) fd.append("driveFolderId", uploadDriveFolderId.trim());

      try {
        const res = await fetch(`/api/admin/events/${eventId}/upload`, { method: "POST", body: fd });
        const data = await res.json();
        if (data.success) {
          totalUploaded += data.data.uploaded;
          totalSkipped += data.data.skipped;
        }
      } catch {
        // continue other batches
      }
      setUploadProgress({ uploaded: totalUploaded, skipped: totalSkipped, total: files.length });
    }

    await refreshCategories();
    setUploading(false);
    setUploadOpen(false);
    setNewCategoryInput("");
    toast(
      `Uploaded ${totalUploaded} photo${totalUploaded !== 1 ? "s" : ""}` +
      (totalSkipped ? `, skipped ${totalSkipped} blurry` : ""),
      "success"
    );
  }

  // ── edit event ────────────────────────────────────────────────────────
  function openSettings() {
    if (!event) return;
    setEditForm({
      name: event.name,
      clientName: event.clientName,
      eventDate: event.eventDate.slice(0, 10),
      pin: event.pin,
      description: event.description ?? "",
      status: event.status,
      minSelection: event.minSelection?.toString() ?? "",
      maxSelection: event.maxSelection?.toString() ?? "",
      allowDownload: event.allowDownload ?? false,
    });
    setSettingsOpen(true);
  }

  async function handleSaveSettings() {
    if (!editForm.name || !editForm.clientName || !editForm.eventDate || !editForm.pin) {
      toast("Please fill in all required fields", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          minSelection: editForm.minSelection ? Number(editForm.minSelection) : undefined,
          maxSelection: editForm.maxSelection ? Number(editForm.maxSelection) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to save", "error");
      } else {
        setEvent(data.data);
        setSettingsOpen(false);
        toast("Event updated", "success");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── album actions ─────────────────────────────────────────────────────
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

  // ── render ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  const categoryNames = categories.map((c) => c.name);

  return (
    <div className="min-h-screen">
      {networkStatus !== "online" && (
        <div
          className={`sticky top-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
            networkStatus === "offline"
              ? "bg-red-600 text-white"
              : "bg-amber-400 text-amber-900"
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 bg-current" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
          </span>
          {networkStatus === "offline"
            ? "No internet connection — uploads and syncs will fail"
            : "Slow connection detected — uploads may take longer than usual"}
        </div>
      )}
      <AdminPageHeader
        title={event?.name ?? "Event"}
        subtitle={event?.clientName}
        action={
          <div className="flex items-center gap-3">
            <Badge variant={event?.status === "active" ? "green" : event?.status === "locked" ? "gold" : "gray"}>
              {event?.status}
            </Badge>
            <Button size="sm" variant="ghost" onClick={openSettings}>
              <Settings size={14} /> Settings
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}>
              <Share2 size={14} /> Share
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSyncOpen(true)}>
              <RefreshCw size={14} /> Sync Drive
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Upload size={14} /> Upload
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
            { label: "Total Photos", value: categories.reduce((s, c) => s + c.count, 0), icon: <ImageIcon size={16} />, color: "text-[#D6C3A3]", bg: "bg-[#D6C3A3]/10" },
            { label: "Selected", value: album?.selectedPhotoIds?.length ?? 0, icon: <CheckCircle size={16} />, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Categories", value: categories.length, icon: <Folder size={16} />, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Album Status", value: album?.status ?? "—", icon: <AlertCircle size={16} />, color: "text-amber-600", bg: "bg-amber-50" },
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
            {album.selectedPhotoIds && album.selectedPhotoIds.length > 0 && (
              <div className="p-4">
                <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-[0.15em] mb-3">
                  Selected Photos ({album.selectedPhotoIds.length})
                </p>
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                  {(album.selectedPhotoIds as unknown as IPhoto[]).map((photo) => (
                    <div key={typeof photo === "string" ? photo : photo._id} className="aspect-square rounded-lg overflow-hidden bg-[#EDE7DD]">
                      {typeof photo !== "string" && photo.thumbnailUrl && (
                        <Image src={photo.thumbnailUrl.replace(/=s\d+$/, "=s200")} alt={photo.filename ?? ""} width={80} height={80} className="w-full h-full object-cover" unoptimized />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Folders */}
        <div className="bg-white rounded-2xl card-shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EDE7DD] flex items-center justify-between">
            <h2 className="font-display text-lg text-[#2B2B2B]">Folders</h2>
            {categories.length > 0 && (
              <button
                onClick={() => setDeleteTarget({ type: "all", count: categories.reduce((s, c) => s + c.count, 0) })}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                <Trash2 size={13} /> Delete all
              </button>
            )}
          </div>

          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Upload size={28} className="text-[#D6C3A3] mb-3" />
              <p className="font-display text-base text-[#2B2B2B] mb-1">No photos yet</p>
              <p className="text-sm text-[#6B6B6B] mb-4">Upload directly or sync from Google Drive.</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setUploadOpen(true)}>
                  <Upload size={14} /> Upload Photos
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSyncOpen(true)}>
                  <RefreshCw size={14} /> Sync Drive
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
              {categories.map((cat) => (
                <div key={cat.name} className="group relative rounded-xl overflow-hidden aspect-video bg-[#EDE7DD]">
                  <button
                    onClick={() => router.push(`/admin/events/${eventId}/folder/${encodeURIComponent(cat.name)}`)}
                    className="absolute inset-0 text-left hover:ring-2 hover:ring-[#D6C3A3] transition-all rounded-xl"
                  >
                    {cat.cover && (
                      <Image
                        src={cat.cover.replace(/=s\d+$/, "=s400")}
                        alt={cat.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, 25vw"
                        unoptimized
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white font-medium text-sm truncate">{cat.name}</p>
                      <p className="text-white/70 text-xs">{cat.count} photos</p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "category", category: cat.name, count: cat.count }); }}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-lg bg-black/50 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    title={`Delete ${cat.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Upload modal ── */}
      <Modal open={uploadOpen} onClose={() => !uploading && setUploadOpen(false)} title="Upload Photos">
        <div className="space-y-4">
          {/* Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B6B6B] uppercase tracking-[0.12em] mb-1.5">
                Category
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#EDE7DD] bg-white text-[#2B2B2B] focus:outline-none focus:border-[#D6C3A3] focus:ring-2 focus:ring-[#D6C3A3]/20"
                disabled={!!newCategoryInput.trim()}
              >
                {categoryNames.length === 0 && <option value="General">General</option>}
                {categoryNames.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Input
              label="Or create new"
              placeholder="e.g. Wedding Candid"
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
            />
          </div>

          {/* Options */}
          <div className="flex items-center gap-3 bg-[#FBF9F6] rounded-xl px-4 py-3 border border-[#EDE7DD]">
            <input
              id="removeBlurry"
              type="checkbox"
              checked={removeBlurry}
              onChange={(e) => setRemoveBlurry(e.target.checked)}
              className="w-4 h-4 accent-[#D6C3A3]"
            />
            <label htmlFor="removeBlurry" className="text-sm text-[#2B2B2B] cursor-pointer select-none">
              Automatically remove blurry photos
            </label>
          </div>

          {/* Optional Drive folder */}
          <Input
            label="Save to Drive Folder ID (optional)"
            placeholder="Paste a Drive folder ID to organise uploads"
            value={uploadDriveFolderId}
            onChange={(e) => setUploadDriveFolderId(e.target.value)}
          />

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (!uploading && e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
            }}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-[#D6C3A3] bg-[#D6C3A3]/10"
                : "border-[#EDE7DD] hover:border-[#D6C3A3] hover:bg-[#FBF9F6]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) handleUpload(e.target.files); }}
            />

            {uploading ? (
              <div className="space-y-3">
                <Spinner className="w-8 h-8 mx-auto text-[#D6C3A3]" />
                <p className="text-sm font-medium text-[#2B2B2B]">
                  Uploading {uploadProgress.uploaded} / {uploadProgress.total}
                  {uploadProgress.skipped > 0 && ` · ${uploadProgress.skipped} blurry skipped`}
                </p>
                {/* Progress bar */}
                <div className="w-full bg-[#EDE7DD] rounded-full h-1.5">
                  <div
                    className="bg-[#D6C3A3] h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.total ? (uploadProgress.uploaded / uploadProgress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-[#EDE7DD] flex items-center justify-center mx-auto mb-3">
                  <Upload size={22} className="text-[#D6C3A3]" />
                </div>
                <p className="text-sm font-medium text-[#2B2B2B] mb-1">
                  Drag &amp; drop photos here
                </p>
                <p className="text-xs text-[#6B6B6B]">or click to browse — JPG, PNG, WEBP</p>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setUploadOpen(false)} disabled={uploading}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Share modal ── */}
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share with Client">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-[0.15em] mb-2">
              Unique Gallery Link
            </p>
            {event?.shareToken ? (
              <>
                <div className="flex items-center gap-2 bg-[#FBF9F6] border border-[#EDE7DD] rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-sm text-[#2B2B2B] truncate font-mono">
                    {getGalleryUrl(event)}
                  </span>
                  <button
                    onClick={handleCopyUrl}
                    className="shrink-0 text-xs text-[#D6C3A3] hover:text-[#B89B72] transition-colors flex items-center gap-1.5"
                  >
                    {copiedUrl ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy Link</>}
                  </button>
                </div>
                <p className="text-xs text-[#6B6B6B] mt-1.5">
                  Clients can open this link directly — no PIN needed.
                </p>
              </>
            ) : (
              <div className="flex items-center gap-3 bg-[#FBF9F6] border border-dashed border-[#EDE7DD] rounded-xl px-3 py-2.5">
                <span className="flex-1 text-sm text-[#6B6B6B]/50 italic">No link yet</span>
                <Button size="sm" variant="outline" loading={regenerating} onClick={handleRegenerateToken}>
                  <RefreshCw size={13} /> Generate Link
                </Button>
              </div>
            )}
          </div>
          <div className="border-t border-[#EDE7DD] pt-4">
            <p className="text-xs font-medium text-[#6B6B6B] uppercase tracking-[0.15em] mb-2">
              WhatsApp / SMS Message
            </p>
            <pre className="whitespace-pre-wrap text-sm text-[#2B2B2B] bg-[#FBF9F6] border border-[#EDE7DD] rounded-xl p-4 font-sans leading-relaxed">
              {event ? buildShareMessage(event) : ""}
            </pre>
          </div>
          <div className="flex gap-3 flex-wrap">
            {event?.shareToken && (
              <Button variant="outline" size="sm" loading={regenerating} onClick={handleRegenerateToken}>
                <RefreshCw size={14} /> Regenerate Link
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setShareOpen(false)}>Close</Button>
            <Button onClick={handleCopy} disabled={!event?.shareToken}>
              {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Message</>}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Settings modal ── */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Event Settings" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Event Name *" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <Input label="Client Name *" value={editForm.clientName} onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Event Date *" type="date" value={editForm.eventDate} onChange={(e) => setEditForm({ ...editForm, eventDate: e.target.value })} />
            <Input label="Access PIN *" value={editForm.pin} onChange={(e) => setEditForm({ ...editForm, pin: e.target.value.toUpperCase() })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Min Selection" type="number" placeholder="e.g. 50" value={editForm.minSelection} onChange={(e) => setEditForm({ ...editForm, minSelection: e.target.value })} />
            <Input label="Max Selection" type="number" placeholder="e.g. 100" value={editForm.maxSelection} onChange={(e) => setEditForm({ ...editForm, maxSelection: e.target.value })} />
          </div>
          <Input label="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />

          {/* Download toggle */}
          <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3.5 border border-[#EDE7DD]">
            <div>
              <h3 className="text-sm font-semibold text-[#2B2B2B] mb-0.5">Allow Photo Downloads</h3>
              <p className="text-xs text-[#6B6B6B]">Clients can download individual photos</p>
            </div>
            <button
              type="button"
              onClick={() => setEditForm({ ...editForm, allowDownload: !editForm.allowDownload })}
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#D6C3A3] focus:ring-offset-2",
                editForm.allowDownload ? "bg-[#D6C3A3]" : "bg-[#D1D5DB]" // gray-300
              )}
              role="switch"
              aria-checked={editForm.allowDownload}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  editForm.allowDownload ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {event && <FaceScanner eventId={event._id} />}

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] uppercase tracking-[0.12em] mb-2">
              Status
            </label>
            <div className="flex gap-2">
              {(["active", "locked", "archived"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setEditForm({ ...editForm, status: s })}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize border-2 transition-all ${
                    editForm.status === s
                      ? s === "active"
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : s === "locked"
                        ? "border-[#D6C3A3] bg-[#D6C3A3]/10 text-[#B89B72]"
                        : "border-[#6B6B6B] bg-[#F5F5F5] text-[#6B6B6B]"
                      : "border-[#EDE7DD] text-[#6B6B6B] hover:border-[#D6C3A3]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#6B6B6B] mt-1.5">
              {editForm.status === "locked" ? "Clients cannot make changes when locked." : editForm.status === "archived" ? "Event is hidden from the client gallery." : "Gallery is open for client selection."}
            </p>
          </div>

          {/* Allow Download toggle */}
          {/* <div className="flex items-center justify-between p-3 bg-[#FBF9F6] rounded-xl border border-[#EDE7DD]">
            <div>
              <p className="text-sm font-medium text-[#2B2B2B]">Allow Photo Downloads</p>
              <p className="text-xs text-[#6B6B6B] mt-0.5">Clients can download individual photos</p>
            </div>
            <button
              onClick={() => setEditForm({ ...editForm, allowDownload: !editForm.allowDownload })}
              className={`relative w-10 h-6 rounded-full transition-colors ${editForm.allowDownload ? "bg-emerald-500" : "bg-[#EDE7DD]"}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${editForm.allowDownload ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          </div> */}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleSaveSettings}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* ── Sync Drive modal ── */}
      <Modal open={syncOpen} onClose={() => { setSyncOpen(false); setFolderId(""); setFolderName(null); }} title="Sync from Google Drive">
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
          {/* Folder name preview */}
          <div className="h-8 flex items-center">
            {fetchingFolder && (
              <span className="text-xs text-[#6B6B6B] flex items-center gap-1.5">
                <Spinner className="h-3 w-3" /> Looking up folder…
              </span>
            )}
            {!fetchingFolder && folderName && (
              <span className="text-xs flex items-center gap-1.5 text-emerald-700">
                <Folder size={12} />
                <span className="font-medium">{folderName}</span>
              </span>
            )}
            {!fetchingFolder && folderId.trim() && !folderName && (
              <span className="text-xs text-red-500 flex items-center gap-1.5">
                <AlertCircle size={12} /> Folder not found — check the ID
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B6B6B]">
            Find the folder ID in the URL: drive.google.com/drive/folders/<strong>FOLDER_ID</strong>
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setSyncOpen(false); setFolderId(""); setFolderName(null); }}>Cancel</Button>
            <Button className="flex-1" loading={syncing} onClick={handleSync}>
              <RefreshCw size={14} /> Sync Photos
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirmation modal ── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title={deleteTarget?.type === "all" ? "Delete All Photos" : `Delete "${deleteTarget?.category}"`}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              {deleteTarget?.type === "all"
                ? `This will permanently delete all ${deleteTarget.count} photos from this event. This cannot be undone.`
                : `This will permanently delete all ${deleteTarget?.count} photos in the "${deleteTarget?.category}" folder. This cannot be undone.`}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" loading={deleting} onClick={handleDelete}>
              <Trash2 size={14} /> Delete {deleteTarget?.count} photos
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
