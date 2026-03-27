import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Event from "@/models/Event";

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) return NextResponse.redirect(new URL("/login", req.url));

  try {
    await connectDB();
    const event = await Event.findById(eventId).lean();
    if (event?.shareToken) {
      // Correctly bounce unauthenticated users to this specific event's PIN page
      return NextResponse.redirect(new URL(`/g/${event.shareToken}`, req.url));
    }
  } catch (error) {
    console.error("Event login redirect error:", error);
  }
  
  // Fallback
  return NextResponse.redirect(new URL("/login", req.url));
}
