import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Photo from "@/models/Photo";
import { getSession } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

// PUT /api/admin/events/[eventId]/faces
export async function PUT(req: NextRequest, props: { params: Promise<{ eventId: string }> }) {
  const session = await getSession();
  if (!session || session.eventId !== "admin") return err("Unauthorized", 401);

  const { eventId } = await props.params;
  const { photoId, faceDescriptors } = await req.json();

  if (!photoId || !faceDescriptors) return err("Missing data", 400);

  await connectDB();
  await Photo.findByIdAndUpdate(photoId, { faceDescriptors });

  return ok({ success: true });
}
