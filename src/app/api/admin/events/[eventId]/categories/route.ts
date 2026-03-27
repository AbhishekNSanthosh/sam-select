import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/connect";
import Photo from "@/models/Photo";
import { getSession } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

export interface CategorySummary {
  name: string;
  count: number;
  cover: string;
}

// GET /api/admin/events/[eventId]/categories
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await getSession();
  if (!session || session.eventId !== "admin") return err("Unauthorized", 401);

  const { eventId } = await params;
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

// DELETE /api/admin/events/[eventId]/categories?category=<name>
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await getSession();
  if (!session || session.eventId !== "admin") return err("Unauthorized", 401);

  const category = req.nextUrl.searchParams.get("category");
  if (!category) return err("category query param is required");

  const { eventId } = await params;
  await connectDB();

  const result = await Photo.deleteMany({
    eventId: new mongoose.Types.ObjectId(eventId),
    category,
  });

  return ok({ deleted: result.deletedCount });
}
