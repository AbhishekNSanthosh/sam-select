import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Event from "@/models/Event";
import Album from "@/models/Album";
import RateLimit from "@/models/RateLimit";
import { buildSessionCookie } from "@/lib/utils/session";
import { err } from "@/lib/utils/response";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

// GET — return public event info for the landing page (name only, no PIN)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  await connectDB();

  const event = await Event.findOne(
    { shareToken: token, status: { $ne: "archived" } },
    { name: 1, clientName: 1, eventDate: 1, description: 1 }
  );

  if (!event) return err("Invalid or expired link", 404);

  return NextResponse.json({
    success: true,
    data: {
      name: event.name,
      clientName: event.clientName,
      eventDate: event.eventDate,
      description: event.description ?? null,
    },
  });
}

// POST — validate PIN, enforce rate limit, set session cookie
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const ip = getClientIp(req);

  await connectDB();

  // Check rate limit
  const rl = await RateLimit.findOne({ ip });
  if (rl) {
    if (rl.lockedUntil && rl.lockedUntil > new Date()) {
      const secsLeft = Math.ceil((rl.lockedUntil.getTime() - Date.now()) / 1000);
      const minsLeft = Math.ceil(secsLeft / 60);
      return err(
        `Too many incorrect attempts. Try again in ${minsLeft} minute${minsLeft !== 1 ? "s" : ""}.`,
        429
      );
    }
  }

  const body = await req.json().catch(() => ({}));
  const { pin } = body as { pin?: string };

  if (!pin || typeof pin !== "string") {
    return err("PIN is required", 400);
  }

  const event = await Event.findOne({ shareToken: token, status: { $ne: "archived" } });

  if (!event || event.pin !== pin.trim().toUpperCase()) {
    // Record failed attempt
    const attempts = (rl?.attempts ?? 0) + 1;
    const shouldLock = attempts >= MAX_ATTEMPTS;

    await RateLimit.findOneAndUpdate(
      { ip },
      {
        $set: {
          attempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    if (shouldLock) {
      return err(
        `Too many incorrect attempts. Your access has been locked for 5 minutes.`,
        429
      );
    }

    const remaining = MAX_ATTEMPTS - attempts;
    return err(
      `Invalid PIN. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
      401
    );
  }

  // PIN correct — clear rate limit
  await RateLimit.deleteOne({ ip });

  let album = await Album.findOne({ eventId: event._id });
  if (!album) {
    album = await Album.create({ eventId: event._id, selectedPhotoIds: [] });
  }

  const cookie = buildSessionCookie({
    eventId: event._id.toString(),
    eventName: event.name,
    clientName: event.clientName,
    albumId: album._id.toString(),
    albumStatus: album.status,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });

  return new Response(
    JSON.stringify({
      success: true,
      data: { eventId: event._id.toString() },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookie,
      },
    }
  );
}
