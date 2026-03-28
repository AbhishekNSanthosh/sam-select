import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
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
  const isAdmin = session.eventId === "admin";
  const event = await Event.findById(eventId).select(isAdmin ? "" : "-pin");
  if (!event) return err("Event not found", 404);

  return ok(event);
}

// PATCH /api/events/[eventId] — Admin: update event fields or regenerate share token
// Body (all optional):
//   action: "regenerate_token"  → just regenerates the shareToken
//   name, clientName, eventDate, pin, description, status, minSelection, maxSelection → update fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await getSession();
  if (!session || session.eventId !== "admin") return err("Unauthorized", 401);

  const { eventId } = await params;
  await connectDB();

  const contentType = req.headers.get("content-type") || "";
  let body: Record<string, any> = {};

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    body = Object.fromEntries(formData.entries());
    
    // Check if there's a new cover photo uploaded
    const coverFile = formData.get("cover") as File | null;
    const coverFolderId = formData.get("coverFolderId") as string | null;
    console.log("PATCH API: coverFile is", coverFile ? `File(size: ${coverFile.size})` : null, "coverFolderId:", coverFolderId);
    
    if (coverFile && coverFile.size > 0) {
      const { uploadFileToDrive, listEventFolders, createDriveFolder } = await import("@/lib/drive/service");
      
      let resolvedFolderId = coverFolderId || undefined;
      // Completely automate folder routing if none explicitly provided
      if (!resolvedFolderId && process.env.GOOGLE_DRIVE_FOLDER_ID) {
        const clientName = (formData.get("clientName") as string) || "Unknown Client";
        try {
          const rootFolder = process.env.GOOGLE_DRIVE_FOLDER_ID;
          const existingFolders = await listEventFolders(rootFolder);
          const match = existingFolders.find(f => f.name.trim().toLowerCase() === clientName.trim().toLowerCase());
          if (match) {
            resolvedFolderId = match.id;
          } else {
            resolvedFolderId = await createDriveFolder(clientName, rootFolder);
          }
        } catch (e) {
          console.error("Failed to auto-provision drive folder, falling back...", e);
        }
      }

      const buffer = Buffer.from(await coverFile.arrayBuffer());
      const { thumbnailUrl } = await uploadFileToDrive(
        buffer,
        coverFile.name,
        coverFile.type,
        resolvedFolderId
      );
      body.coverPhoto = thumbnailUrl;
    }
  } else {
    body = await req.json().catch(() => ({}));
  }

  if (body.action === "regenerate_token") {
    const event = await Event.findByIdAndUpdate(
      eventId,
      { shareToken: randomUUID() },
      { new: true }
    );
    if (!event) return err("Event not found", 404);
    return ok({ shareToken: event.shareToken });
  }

  const ALLOWED = ["name", "clientName", "eventDate", "pin", "description", "status", "minSelection", "maxSelection", "allowDownload", "coverPhoto"] as const;
  const VALID_STATUSES = ["active", "locked", "archived"];

  const update: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body && body[key] !== undefined && body[key] !== "") {
      update[key] = body[key];
    }
  }

  if ("status" in update && !VALID_STATUSES.includes(update.status as string)) {
    return err("Invalid status", 400);
  }
  if ("eventDate" in update) {
    update.eventDate = new Date(update.eventDate as string);
  }
  if ("pin" in update) {
    const existing = await Event.findOne({ pin: update.pin as string, _id: { $ne: eventId } });
    if (existing) return err("PIN already in use by another event", 409);
  }

  if (Object.keys(update).length === 0) return err("No valid fields to update", 400);

  const event = await Event.findByIdAndUpdate(eventId, update, { new: true });
  if (!event) return err("Event not found", 404);

  return ok(event);
}
