import { connectDB } from "@/lib/db/connect";
import Album from "@/models/Album";
import { getSession } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

// GET /api/admin/albums — list all submitted/approved albums
export async function GET() {
  const session = await getSession();
  if (!session || session.eventId !== "admin") return err("Unauthorized", 401);

  await connectDB();

  const albums = await Album.find({ status: { $in: ["submitted", "approved", "changes_requested"] } })
    .populate("eventId", "name clientName eventDate")
    .populate("selectedPhotoIds", "thumbnailUrl fullUrl filename")
    .sort({ submittedAt: -1 });

  return ok(albums);
}
