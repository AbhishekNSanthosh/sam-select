import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Photo from "@/models/Photo";
import { getSession } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);

    const { photoIds } = await req.json();
    if (!Array.isArray(photoIds)) {
      return err("Expected photoIds array", 400);
    }

    await connectDB();

    // Fetch the actual photos based on the cluster's photoIds
    // Also ensuring they belong to the correct eventId for security
    const photos = await Photo.find({
      _id: { $in: photoIds },
      eventId: session.eventId === "admin" ? { $exists: true } : session.eventId,
    }).lean();

    return ok(photos);
  } catch (error: any) {
    return err(error.message, 500);
  }
}
