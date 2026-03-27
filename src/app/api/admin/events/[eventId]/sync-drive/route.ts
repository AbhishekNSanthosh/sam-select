import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Photo from "@/models/Photo";
import Event from "@/models/Event";
import { listFolderImages } from "@/lib/drive/service";
import { getSession } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

// POST /api/admin/events/[eventId]/sync-drive
// Syncs photos from a Google Drive folder into the event
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await getSession();
  if (!session || session.eventId !== "admin") return err("Unauthorized", 401);

  const { eventId } = await params;
  const { folderId } = await req.json();

  if (!folderId) return err("folderId is required", 400);

  await connectDB();

  const event = await Event.findById(eventId);
  if (!event) return err("Event not found", 404);

  const driveFiles = await listFolderImages(folderId);

  if (driveFiles.length === 0) {
    return ok({ synced: 0, message: "No images found in folder" });
  }

  // Get existing drive file IDs to avoid duplicates
  const existing = await Photo.find({ eventId }).select("driveFileId");
  const existingIds = new Set(existing.map((p) => p.driveFileId));

  const newFiles = driveFiles.filter((f) => !existingIds.has(f.id));

  if (newFiles.length === 0) {
    return ok({ synced: 0, message: "All photos already synced" });
  }

  const docs = newFiles.map((f, i) => ({
    eventId,
    driveFileId: f.id,
    thumbnailUrl: f.thumbnailUrl,
    fullUrl: f.fullUrl,
    filename: f.name,
    width: f.width,
    height: f.height,
    aspectRatio: f.width && f.height ? f.width / f.height : undefined,
    order: existing.length + i,
  }));

  await Photo.insertMany(docs);
  const total = await Photo.countDocuments({ eventId });
  await Event.findByIdAndUpdate(eventId, { totalPhotos: total });

  return ok({ synced: newFiles.length, total });
}
