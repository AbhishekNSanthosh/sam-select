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
  Edit2,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import FaceScanner from "@/components/admin/FaceScanner";
import { useToast } from "@/components/ui/Toast";
import ImageCropper from "@/components/ui/ImageCropper";
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
    coverFile: null as File | null,
  });
  const [saving, setSaving] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  // Share
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Sync
  const [folderId, setFolderId] = useState("");
  const [syncCategoryName, setSyncCategoryName] = useState("");
  const [folderName, setFolderName] = useState<string | null>(null);
  const [fetchingFolder, setFetchingFolder] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Upload
  const [uploadCategory, setUploadCategory] = useState("General");
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [removeBlurry, setRemoveBlurry] = useState(true);
  const [uploadDriveFolderId, setUploadDriveFolderId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ uploaded: 0, skipped: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Album
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: "all" | "category"; category?: string; count: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit folder
  const [editFolderTarget, setEditFolderTarget] = useState<{ oldName: string; newName: string } | null>(null);
  const [editingFolder, setEditingFolder] = useState(false);

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

  async function handleCreateFolder() {
    setCreatingFolder(true);
    try {
      let folderName = event?.name || "New Event Folder";
      folderName += uploadCategory === "default" ? " - General" : ` - ${uploadCategory}`;

      const res = await fetch("/api/admin/drive/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: folderName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUploadDriveFolderId(data.data.folderId);
      toast("Drive folder auto-created!", "success");
    } catch (err: any) {
      toast(err.message || "Failed to create folder", "error");
    } finally {
      setCreatingFolder(false);
    }
  }

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
        body: JSON.stringify({
          folderId: folderId.trim(),
          ...(syncCategoryName.trim() ? { categoryName: syncCategoryName.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Sync failed", "error");
      } else {
        toast(`Synced ${data.data.synced} new photos (${data.data.total} total)`, "success");
        setSyncOpen(false);
        setFolderId("");
        setSyncCategoryName("");
        setFolderName(null);
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

  // ── edit folder properties ───────────────────────────────────────────
  async function handleEditFolder() {
    if (!editFolderTarget || !editFolderTarget.newName.trim()) return;
    setEditingFolder(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/categories`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName: editFolderTarget.oldName, newName: editFolderTarget.newName.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to rename folder", "error");
      } else {
        toast("Folder renamed successfully", "success");
        setEditFolderTarget(null);
        await refreshCategories();
      }
    } catch {
      toast("Could not connect to update folder", "error");
    } finally {
      setEditingFolder(false);
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

  // ── window-level drag-and-drop when upload modal is open ──────────────
  useEffect(() => {
    if (!uploadOpen || uploading) return;

    function onDragOver(e: DragEvent) {
      e.preventDefault();
      setDragOver(true);
    }
    function onDragLeave(e: DragEvent) {
      // Only clear when leaving the viewport entirely
      if (e.clientX === 0 && e.clientY === 0) setDragOver(false);
    }
    function onDrop(e: DragEvent) {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer?.files.length) handleUpload(e.dataTransfer.files);
    }

    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadOpen, uploading]);

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
      coverFile: null,
    });
    setSettingsOpen(true);
  }

  async function handleSaveSettings() {
    if (!editForm.name || !editForm.clientName || !editForm.eventDate || !editForm.pin) {
      toast("Please fill in all required fields", "error");
      return;
    }
    if (!/^\d{6}$/.test(editForm.pin)) {
      toast("Access PIN must be exactly 6 digits", "error");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", editForm.name);
      fd.append("clientName", editForm.clientName);
      fd.append("eventDate", editForm.eventDate);
      fd.append("pin", editForm.pin);
      if (editForm.description) fd.append("description", editForm.description);
      fd.append("status", editForm.status);
      if (editForm.minSelection) fd.append("minSelection", editForm.minSelection);
      if (editForm.maxSelection) fd.append("maxSelection", editForm.maxSelection);
      fd.append("allowDownload", String(editForm.allowDownload));
      if (editForm.coverFile) {
        fd.append("cover", editForm.coverFile);
      }

      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        body: fd,
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
        <div className="bg-white rounded-xl border border-[#EDE7DD] p-4 flex items-center gap-4 flex-wrap">
          <div className="w-10 h-10 rounded-lg bg-[#F5EFE6] flex items-center justify-center shrink-0">
            <ImageIcon size={18} className="text-[#B89B72]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-base text-[#2B2B2B]">{event?.name}</p>
            <p className="text-xs text-[#A09080]">
              {new Date(event?.eventDate ?? "").toLocaleDateString("en-IN", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Photos", value: categories.reduce((s, c) => s + c.count, 0), icon: <ImageIcon size={15} />, color: "text-[#B89B72]", bg: "bg-[#F5EFE6]" },
            { label: "Selected", value: album?.selectedPhotoIds?.length ?? 0, icon: <CheckCircle size={15} />, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Categories", value: categories.length, icon: <Folder size={15} />, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Album Status", value: album?.status ?? "—", icon: <AlertCircle size={15} />, color: "text-amber-600", bg: "bg-amber-50" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-[#EDE7DD] p-4">
              <div className={`w-8 h-8 rounded-lg ${s.bg} ${s.color} flex items-center justify-center mb-2`}>
                {s.icon}
              </div>
              <p className="font-display text-xl text-[#2B2B2B]">{s.value}</p>
              <p className="text-xs text-[#A09080] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Album review card */}
        {album && (
          <div className="bg-white rounded-xl border border-[#EDE7DD] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#EDE7DD] flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-display text-base text-[#2B2B2B]">Album Review</h2>
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
                  <span className="text-xs text-[#A09080]">
                    Submitted {new Date(album.submittedAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <div className="px-5 py-3.5 flex gap-3 flex-wrap border-b border-[#EDE7DD]">
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
                        <img 
                          src={`/api/photos/proxy?url=${encodeURIComponent(photo.thumbnailUrl.replace(/=s\d+$/, "=s200"))}`}
                          alt={photo.filename ?? ""} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.fallback) {
                              target.dataset.fallback = "1";
                              target.src = photo.thumbnailUrl;
                            }
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Folders */}
        <div className="bg-white rounded-xl border border-[#EDE7DD] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#EDE7DD] flex items-center justify-between">
            <h2 className="font-display text-base text-[#2B2B2B]">Folders</h2>
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
              <div className="w-12 h-12 rounded-xl bg-[#F5EFE6] flex items-center justify-center mx-auto mb-3">
                <Upload size={20} className="text-[#B89B72]" />
              </div>
              <p className="font-display text-base text-[#2B2B2B] mb-1">No photos yet</p>
              <p className="text-sm text-[#A09080] mb-4">Upload directly or sync from Google Drive.</p>
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
                      <p className="text-white font-medium text-sm truncate">{cat.name}</p>
                      <p className="text-white/70 text-xs">{cat.count} photos</p>
                    </div>
                  </button>
                  <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditFolderTarget({ oldName: cat.name, newName: cat.name }); }}
                      className="w-7 h-7 rounded-lg bg-black/50 hover:bg-blue-600 text-white flex items-center justify-center transition-colors"
                      title={`Rename ${cat.name}`}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "category", category: cat.name, count: cat.count }); }}
                      className="w-7 h-7 rounded-lg bg-black/50 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                      title={`Delete ${cat.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Face Scanner - Required to power "Find My Photos" & "Smart Groups" features for the client */}
        <FaceScanner eventId={eventId} />
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
          <div className="relative">
            {event?.name && (
              <button
                type="button"
                className="absolute right-0 top-0 translate-y-[2px] text-[10px] uppercase tracking-wide font-bold text-[#b89b72] hover:text-[#917957] transition-colors z-10"
                onClick={() => handleCreateFolder()}
                disabled={creatingFolder}
              >
                {creatingFolder ? "Creating..." : "✨ Auto-create Folder"}
              </button>
            )}
            <Input
              label="Save to Drive Folder ID (optional)"
              placeholder="Paste a Drive folder ID to organise uploads"
              value={uploadDriveFolderId}
              onChange={(e) => setUploadDriveFolderId(e.target.value)}
            />
          </div>

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
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share with Client" size="lg">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[#A09080] mb-2">
              Unique Gallery Link
            </p>
            {event?.shareToken ? (
              <>
                <div className="flex items-center gap-2 bg-[#FAFAFA] border border-[#EDE7DD] rounded-lg px-3 py-2.5">
                  <span className="flex-1 text-sm text-[#2B2B2B] truncate font-mono min-w-0">
                    {getGalleryUrl(event)}
                  </span>
                  <button
                    onClick={handleCopyUrl}
                    className="shrink-0 text-xs text-[#B89B72] hover:text-[#9A7D5A] transition-colors flex items-center gap-1.5"
                  >
                    {copiedUrl ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
                <p className="text-xs text-[#A09080] mt-1.5">
                  Clients can open this link directly — no PIN needed.
                </p>
              </>
            ) : (
              <div className="flex items-center gap-3 bg-[#FAFAFA] border border-dashed border-[#EDE7DD] rounded-lg px-3 py-2.5">
                <span className="flex-1 text-sm text-[#A09080] italic">No link yet</span>
                <Button size="sm" variant="outline" loading={regenerating} onClick={handleRegenerateToken}>
                  <RefreshCw size={13} /> Generate Link
                </Button>
              </div>
            )}
          </div>

          <div className="border-t border-[#EDE7DD] pt-4">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[#A09080] mb-2">
              WhatsApp / SMS Message
            </p>
            <pre className="whitespace-pre-wrap break-words overflow-x-auto text-sm text-[#2B2B2B] bg-[#FAFAFA] border border-[#EDE7DD] rounded-lg p-4 font-sans leading-relaxed max-h-48 overflow-y-auto">
              {event ? buildShareMessage(event) : ""}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
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

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Event Settings" size="lg">
        <div className="space-y-5">

          {/* Section: Event Info */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[#A09080] mb-3">Event Info</p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Event Name *" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                <Input label="Client Name *" value={editForm.clientName} onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Event Date *" type="date" value={editForm.eventDate} onChange={(e) => setEditForm({ ...editForm, eventDate: e.target.value })} />
                <Input 
                  label="Access PIN (6 digits) *" 
                  value={editForm.pin} 
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setEditForm({ ...editForm, pin: val });
                  }} 
                />
              </div>
              <Input label="Description (optional)" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              <div>
                <label className="block text-[10px] font-semibold tracking-widest uppercase text-[#A09080] mb-3 mt-4">
                  Update Cover Photo
                </label>
                <div className="flex items-center gap-3">
                  {/* Preview thumbnail */}
                  {(editForm.coverFile || event?.coverPhoto) && (
                    <div className="w-14 h-14 rounded-lg border border-[#EDE7DD] overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={editForm.coverFile ? URL.createObjectURL(editForm.coverFile) : event!.coverPhoto!.replace(/=s\d+$/, "=s200")}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 flex flex-col gap-2">
                    {/* Hidden input, triggered via ref to prevent event bubbling to modal backdrop */}
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setEditForm((prev) => ({ ...prev, coverFile: file }));
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        coverInputRef.current?.click();
                      }}
                      className="flex items-center justify-center gap-2 cursor-pointer bg-[#F5EFE6] hover:bg-[#EDE7DD] text-[#B89B72] font-semibold text-sm rounded-lg px-4 py-2.5 transition-colors w-full border border-[#EDE7DD]"
                    >
                      📷 {editForm.coverFile ? "Change Photo" : "Choose Photo"}
                    </button>
                    {editForm.coverFile && (
                      <button
                        type="button"
                        onClick={() => setEditForm((prev) => ({ ...prev, coverFile: null }))}
                        className="text-xs text-[#A09080] hover:text-red-500 transition-colors text-center"
                      >
                        Remove new photo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-[#EDE7DD]" />

          {/* Section: Gallery Config */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[#A09080] mb-3">Selection Limits</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Min Selection" type="number" placeholder="e.g. 50" value={editForm.minSelection} onChange={(e) => setEditForm({ ...editForm, minSelection: e.target.value })} />
              <Input label="Max Selection" type="number" placeholder="e.g. 100" value={editForm.maxSelection} onChange={(e) => setEditForm({ ...editForm, maxSelection: e.target.value })} />
            </div>
          </div>

          <div className="h-px bg-[#EDE7DD]" />

          {/* Section: Status */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[#A09080] mb-3">Status</p>
            <div className="flex gap-2">
              {(["active", "locked", "archived"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setEditForm({ ...editForm, status: s })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize border transition-all ${
                    editForm.status === s
                      ? s === "active"
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : s === "locked"
                        ? "border-[#D6C3A3] bg-[#F5EFE6] text-[#B89B72]"
                        : "border-[#6B6B6B] bg-[#F5F5F5] text-[#6B6B6B]"
                      : "border-[#EDE7DD] text-[#A09080] hover:border-[#D6C3A3] hover:text-[#2B2B2B]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#A09080] mt-2">
              {editForm.status === "locked" ? "Clients cannot make changes when locked." : editForm.status === "archived" ? "Event is hidden from the client gallery." : "Gallery is open for client selection."}
            </p>
          </div>

          <div className="h-px bg-[#EDE7DD]" />

          {/* Download toggle */}
          <div className="flex items-center justify-between rounded-xl px-4 py-3.5 border border-[#EDE7DD] bg-[#FAFAFA]">
            <div>
              <h3 className="text-sm font-semibold text-[#2B2B2B]">Allow Photo Downloads</h3>
              <p className="text-xs text-[#A09080] mt-0.5">Clients can download individual photos</p>
            </div>
            <button
              type="button"
              onClick={() => setEditForm({ ...editForm, allowDownload: !editForm.allowDownload })}
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#D6C3A3] focus:ring-offset-2",
                editForm.allowDownload ? "bg-[#D6C3A3]" : "bg-[#D1D5DB]"
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

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleSaveSettings}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* ── Sync Drive modal ── */}
      <Modal open={syncOpen} onClose={() => { setSyncOpen(false); setFolderId(""); setSyncCategoryName(""); setFolderName(null); }} title="Sync from Google Drive">
        <div className="space-y-4">
          <p className="text-sm text-[#A09080]">
            Enter the Google Drive folder ID containing the event photos. All images will be synced automatically.
          </p>

          <Input
            label="Google Drive Folder ID"
            placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
          />

          {/* Folder name preview */}
          <div className="h-7 flex items-center">
            {fetchingFolder && (
              <span className="text-xs text-[#A09080] flex items-center gap-1.5">
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

          <Input
            label="Folder display name (shown to client)"
            placeholder={folderName ?? "e.g. Wedding Ceremony"}
            value={syncCategoryName}
            onChange={(e) => setSyncCategoryName(e.target.value)}
          />

          <p className="text-xs text-[#A09080]">
            Find the folder ID in the URL: drive.google.com/drive/folders/<strong>FOLDER_ID</strong>
          </p>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setSyncOpen(false); setFolderId(""); setSyncCategoryName(""); setFolderName(null); }}>Cancel</Button>
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

      {/* ── Edit folder modal ── */}
      <Modal open={!!editFolderTarget} onClose={() => !editingFolder && setEditFolderTarget(null)} title="Rename Folder">
        <div className="space-y-4">
          <Input
            label="Folder Name"
            value={editFolderTarget?.newName ?? ""}
            onChange={(e) => setEditFolderTarget((prev) => prev ? { ...prev, newName: e.target.value } : null)}
            placeholder="e.g. Wedding Ceremony"
            autoFocus
          />
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setEditFolderTarget(null)} disabled={editingFolder}>Cancel</Button>
            <Button className="flex-1" loading={editingFolder} onClick={handleEditFolder}>Save Name</Button>
          </div>
        </div>
      </Modal>

      {/* ── Image Crop Modal ── */}
      {cropSrc && (
        <ImageCropper
          open={!!cropSrc}
          imageSrc={cropSrc}
          onClose={() => setCropSrc(null)}
          onCropCompleteAction={(croppedFile: File) => {
            setEditForm((prev) => ({ ...prev, coverFile: croppedFile }));
            setCropSrc(null);
          }}
          aspect={16 / 9}
        />
      )}
    </div>
  );
}
