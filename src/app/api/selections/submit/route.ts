import { connectDB } from "@/lib/db/connect";
import Album from "@/models/Album";
import Event from "@/models/Event";
import { getSession } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

export async function POST() {
  const session = await getSession();
  if (!session || session.eventId === "admin") return err("Unauthorized", 401);

  await connectDB();

  const [album, event] = await Promise.all([
    Album.findOne({ eventId: session.eventId }),
    Event.findById(session.eventId),
  ]);

  if (!album) return err("Album not found", 404);
  if (!event) return err("Event not found", 404);

  if (album.status === "approved") {
    return err("Album already approved", 409);
  }

  if (album.selectedPhotoIds.length === 0) {
    return err("Please select at least one photo before submitting", 400);
  }

  if (event.minSelection && album.selectedPhotoIds.length < event.minSelection) {
    return err(`Please select at least ${event.minSelection} photos`, 400);
  }

  if (event.maxSelection && album.selectedPhotoIds.length > event.maxSelection) {
    return err(`You can only select up to ${event.maxSelection} photos`, 400);
  }

  album.status = "submitted";
  album.submittedAt = new Date();
  album.lockedAt = new Date();
  await album.save();

  return ok({ status: album.status, submittedAt: album.submittedAt });
}
