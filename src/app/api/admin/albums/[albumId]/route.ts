import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Album from "@/models/Album";
import Event from "@/models/Event";
import { getSession } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

// PATCH /api/admin/albums/[albumId] — approve, request changes, or unlock
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  const session = await getSession();
  if (!session || session.eventId !== "admin") return err("Unauthorized", 401);

  const { albumId } = await params;
  const { action, adminNotes } = await req.json();

  if (!["approve", "request_changes", "unlock"].includes(action)) {
    return err("Invalid action. Must be approve, request_changes, or unlock", 400);
  }

  await connectDB();

  const album = await Album.findById(albumId);
  if (!album) return err("Album not found", 404);

  if (action === "approve") {
    album.status = "approved";
  } else if (action === "request_changes") {
    album.status = "changes_requested";
    album.lockedAt = undefined;
  } else if (action === "unlock") {
    album.status = "draft";
    album.submittedAt = undefined;
    album.lockedAt = undefined;
    await Event.findByIdAndUpdate(album.eventId, { status: "active" });
  }

  if (adminNotes !== undefined) {
    album.adminNotes = adminNotes;
  }

  await album.save();
  return ok(album);
}
