import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Photo from "@/models/Photo";
import Event from "@/models/Event";
import { listFolderImages, grantPublicAccess, getFolderName } from "@/lib/drive/service";
import { getSession } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

// GET /api/admin/events/[eventId]/sync-drive?folderId=<id>
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.eventId !== "admin") return err("Unauthorized", 401);

  const folderId = req.nextUrl.searchParams.get("folderId");
  if (!folderId) return err("folderId is required");

  try {
    const name = await getFolderName(folderId);
    if (!name) return err("Folder not found", 404);
    return ok({ name });
  } catch {
    return err("Could not fetch folder — check the ID and Drive permissions", 404);
  }
}

// POST /api/admin/events/[eventId]/sync-drive
// Syncs photos from a Google Drive folder into the event
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await getSession();
  if (!session || session.eventId !== "admin") return err("Unauthorized", 401);

  const { eventId } = await params;
  const { folderId, categoryName } = await req.json();

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

  // Grant public read on newly synced files so browsers can load them directly.
  // Errors are non-fatal (e.g. service account lacks permission on externally-owned files).
  await Promise.allSettled(newFiles.map((f) => grantPublicAccess(f.id)));

  const finalCategory = categoryName && categoryName.trim().length > 0 ? categoryName.trim() : "General";

  const docs = newFiles.map((f, i) => ({
    eventId,
    driveFileId: f.id,
    thumbnailUrl: f.thumbnailUrl,
    fullUrl: f.fullUrl,
    filename: f.name,
    category: finalCategory,
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
