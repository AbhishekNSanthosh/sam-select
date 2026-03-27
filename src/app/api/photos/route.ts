import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Photo from "@/models/Photo";
import Event from "@/models/Event";
import { getSession } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

// GET /api/photos?eventId=xxx  — fetch all photos for an event
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return err("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) return err("eventId is required", 400);

  // Clients can only access their own event photos
  if (session.eventId !== "admin" && session.eventId !== eventId) {
    return err("Forbidden", 403);
  }

  await connectDB();
  const photos = await Photo.find({ eventId }).sort({ order: 1, createdAt: 1 });
  return ok(photos);
}

// POST /api/photos — Admin: add photos to an event (bulk from Drive)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.eventId !== "admin") return err("Unauthorized", 401);

  const body = await req.json();
  const { eventId, photos } = body;

  if (!eventId || !Array.isArray(photos) || photos.length === 0) {
    return err("eventId and photos array are required", 400);
  }

  await connectDB();

  const event = await Event.findById(eventId);
  if (!event) return err("Event not found", 404);

  const docs = photos.map((p: {
    driveFileId: string;
    thumbnailUrl: string;
    fullUrl: string;
    filename: string;
    width?: number;
    height?: number;
    order?: number;
  }, i: number) => ({
    eventId,
    driveFileId: p.driveFileId,
    thumbnailUrl: p.thumbnailUrl,
    fullUrl: p.fullUrl,
    filename: p.filename,
    width: p.width,
    height: p.height,
    aspectRatio: p.width && p.height ? p.width / p.height : undefined,
    order: p.order ?? i,
  }));

  const inserted = await Photo.insertMany(docs);
  await Event.findByIdAndUpdate(eventId, { totalPhotos: await Photo.countDocuments({ eventId }) });

  return ok({ inserted: inserted.length }, 201);
}
