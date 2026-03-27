import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Event from "@/models/Event";
import { getSession } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await getSession();
  if (!session) return err("Unauthorized", 401);

  const { eventId } = await params;

  // Client can only access their own event; admin can access any
  if (session.eventId !== "admin" && session.eventId !== eventId) {
    return err("Forbidden", 403);
  }

  await connectDB();
  const event = await Event.findById(eventId).select("-pin");
  if (!event) return err("Event not found", 404);

  return ok(event);
}
