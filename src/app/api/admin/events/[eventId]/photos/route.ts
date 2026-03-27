import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import Photo from "@/models/Photo";
import Event from "@/models/Event";
import { getSession } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

// DELETE /api/admin/events/[eventId]/photos — delete ALL photos for an event
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await getSession();
  if (!session || session.eventId !== "admin") return err("Unauthorized", 401);

  const { eventId } = await params;
  await connectDB();

  const result = await Photo.deleteMany({
    eventId: new mongoose.Types.ObjectId(eventId),
  });

  await Event.findByIdAndUpdate(eventId, { totalPhotos: 0 });

  return ok({ deleted: result.deletedCount });
}
