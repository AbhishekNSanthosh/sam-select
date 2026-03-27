import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Event from "@/models/Event";
import Album from "@/models/Album";
import { buildSessionCookie } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();

    if (!pin || typeof pin !== "string") {
      return err("PIN is required", 400);
    }

    // Check admin PIN
    if (pin === process.env.ADMIN_PIN) {
      const session = {
        eventId: "admin",
        eventName: "Admin",
        clientName: "Admin",
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };
      const cookie = buildSessionCookie(session);
      return new Response(
        JSON.stringify({ success: true, data: { role: "admin" } }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": cookie,
          },
        }
      );
    }

    await connectDB();

    const event = await Event.findOne({ pin: pin.trim(), status: { $ne: "archived" } });

    if (!event) {
      return err("Invalid PIN. Please check and try again.", 401);
    }

    // Get or create album
    let album = await Album.findOne({ eventId: event._id });
    if (!album) {
      album = await Album.create({ eventId: event._id, selectedPhotoIds: [] });
    }

    const session = {
      eventId: event._id.toString(),
      eventName: event.name,
      clientName: event.clientName,
      albumId: album._id.toString(),
      albumStatus: album.status,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };

    const cookie = buildSessionCookie(session);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          eventId: event._id,
          eventName: event.name,
          clientName: event.clientName,
          albumStatus: album.status,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookie,
        },
      }
    );
  } catch (error) {
    console.error("[auth/login]", error);
    return err("Something went wrong. Please try again.", 500);
  }
}
