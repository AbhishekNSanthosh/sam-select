import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Album from "@/models/Album";
import "@/models/Photo"; // Ensure Photo model is registered for populate
import { getSession } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

// GET /api/selections — get current draft selection
export async function GET() {
  const session = await getSession();
  if (!session || session.eventId === "admin") return err("Unauthorized", 401);

  await connectDB();
  const album = await Album.findOne({ eventId: session.eventId }).populate("selectedPhotoIds");
  if (!album) return err("Album not found", 404);

  return ok(album);
}

// PUT /api/selections — update selected photo IDs (auto-save draft)
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.eventId === "admin") return err("Unauthorized", 401);

  const { selectedPhotoIds } = await req.json();

  if (!Array.isArray(selectedPhotoIds)) {
    return err("selectedPhotoIds must be an array", 400);
  }

  await connectDB();

  const album = await Album.findOne({ eventId: session.eventId });
  if (!album) return err("Album not found", 404);

  if (album.status === "approved") {
    return err("Album is locked and cannot be modified", 403);
  }

  album.selectedPhotoIds = selectedPhotoIds;
  await album.save();

  return ok({ selectedPhotoIds: album.selectedPhotoIds });
}
