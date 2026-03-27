import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import Photo from "@/models/Photo";
import Event from "@/models/Event";
import { getSession } from "@/lib/utils/session";
import { err } from "@/lib/utils/response";

// GET /api/photos/[photoId]/download
// Proxies the full-res Drive image as a file download.
// Only allowed when the event has allowDownload = true.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const session = await getSession();
  if (!session) return err("Unauthorized", 401);

  const { photoId } = await params;
  await connectDB();

  const photo = await Photo.findById(new mongoose.Types.ObjectId(photoId));
  if (!photo) return err("Photo not found", 404);

  // Clients can only download from their own event
  const eventIdStr = photo.eventId.toString();
  if (session.eventId !== "admin" && session.eventId !== eventIdStr) {
    return err("Forbidden", 403);
  }

  // Check event-level download permission (admin always allowed)
  if (session.eventId !== "admin") {
    const event = await Event.findById(photo.eventId);
    if (!event?.allowDownload) return err("Downloads are not enabled for this event", 403);
  }

  // Fetch the full-res image from Drive CDN and stream it back
  const upstream = await fetch(photo.fullUrl);
  if (!upstream.ok) return err("Could not fetch photo from storage", 502);

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const filename = photo.filename.replace(/\.[^.]+$/, "") + "." + ext;

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
