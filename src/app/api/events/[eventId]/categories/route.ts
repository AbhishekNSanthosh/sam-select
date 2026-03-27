import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import Photo from "@/models/Photo";
import { getSession } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";
import type { CategorySummary } from "@/app/api/admin/events/[eventId]/categories/route";

// GET /api/events/[eventId]/categories — accessible by authenticated clients and admin
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await getSession();
  if (!session) return err("Unauthorized", 401);

  const { eventId } = await params;

  // Clients can only see categories for their own event
  if (session.eventId !== "admin" && session.eventId !== eventId) {
    return err("Forbidden", 403);
  }

  await connectDB();

  const categories = await Photo.aggregate<CategorySummary>([
    { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
    { $sort: { order: 1, createdAt: 1 } },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
        cover: { $first: "$thumbnailUrl" },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, name: "$_id", count: 1, cover: 1 } },
  ]);

  return ok(categories);
}
