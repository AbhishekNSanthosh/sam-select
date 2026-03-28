import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/db/connect";
import Event from "@/models/Event";
import { getSession } from "@/lib/utils/session";
import { uploadFileToDrive } from "@/lib/drive/service";
import { ok, err } from "@/lib/utils/response";

// GET /api/events — Admin: list all events
export async function GET() {
  const session = await getSession();
  if (!session || session.eventId !== "admin") return err("Unauthorized", 401);

  await connectDB();
  const events = await Event.find({}).sort({ createdAt: -1 });
  return ok(events);
}

// POST /api/events — Admin: create new event (FormData)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.eventId !== "admin") return err("Unauthorized", 401);

  const formData = await req.formData();
  const name = formData.get("name") as string;
  const clientName = formData.get("clientName") as string;
  const eventDate = formData.get("eventDate") as string;
  const pin = formData.get("pin") as string;
  const description = formData.get("description") as string;
  const minSelection = formData.get("minSelection") as string;
  const maxSelection = formData.get("maxSelection") as string;
  const coverFile = formData.get("cover") as File | null;
  const coverFolderId = formData.get("coverFolderId") as string | null;

  if (!name || !clientName || !eventDate || !pin) {
    return err("name, clientName, eventDate, and pin are required", 400);
  }

  if (!/^\d{6}$/.test(pin)) {
    return err("PIN must be exactly 6 digits", 400);
  }

  await connectDB();

  const existing = await Event.findOne({ pin });
  if (existing) return err("PIN already in use", 409);

  // Upload cover photo if provided
  let coverPhoto: string | undefined;
  if (coverFile && coverFile.size > 0) {
    try {
      let resolvedFolderId = coverFolderId || undefined;
      if (!resolvedFolderId && process.env.GOOGLE_DRIVE_FOLDER_ID) {
        try {
          const rootFolder = process.env.GOOGLE_DRIVE_FOLDER_ID;
          const { listEventFolders, createDriveFolder } = await import("@/lib/drive/service");
          const existingFolders = await listEventFolders(rootFolder);
          const match = existingFolders.find(f => f.name.trim().toLowerCase() === clientName.trim().toLowerCase());
          if (match) {
            resolvedFolderId = match.id;
          } else {
            resolvedFolderId = await createDriveFolder(clientName, rootFolder);
          }
        } catch (e) {
          console.error("Failed to auto-provision drive folder on event creation...", e);
        }
      }

      const buffer = Buffer.from(await coverFile.arrayBuffer());
      const { thumbnailUrl } = await uploadFileToDrive(
        buffer, 
        coverFile.name, 
        coverFile.type,
        resolvedFolderId
      );
      coverPhoto = thumbnailUrl;
    } catch (driveErr: any) {
      const isQuotaErr = driveErr?.code === 403 || driveErr?.status === 403;
      if (isQuotaErr) {
        return err("Drive upload failed: Share the Drive folder with the service account as Editor.", 503);
      }
      throw driveErr;
    }
  }

  const event = await Event.create({
    name,
    clientName,
    eventDate: new Date(eventDate),
    pin,
    shareToken: randomUUID(),
    description,
    coverPhoto,
    minSelection: minSelection ? Number(minSelection) : undefined,
    maxSelection: maxSelection ? Number(maxSelection) : undefined,
  });

  return ok(event, 201);
}
