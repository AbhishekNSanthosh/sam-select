import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Event from "@/models/Event";
import { getSession } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

// GET /api/events — Admin: list all events
export async function GET() {
  const session = await getSession();
  if (!session || session.eventId !== "admin") return err("Unauthorized", 401);

  await connectDB();
  const events = await Event.find({}).sort({ createdAt: -1 }).select("-pin");
  return ok(events);
}

// POST /api/events — Admin: create new event
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.eventId !== "admin") return err("Unauthorized", 401);

  const body = await req.json();
  const { name, clientName, eventDate, pin, description, minSelection, maxSelection } = body;

  if (!name || !clientName || !eventDate || !pin) {
    return err("name, clientName, eventDate, and pin are required", 400);
  }

  await connectDB();

  const existing = await Event.findOne({ pin });
  if (existing) return err("PIN already in use", 409);

  const event = await Event.create({
    name,
    clientName,
    eventDate: new Date(eventDate),
    pin,
    description,
    minSelection,
    maxSelection,
  });

  return ok(event, 201);
}
