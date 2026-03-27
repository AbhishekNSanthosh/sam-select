import { NextRequest } from "next/server";
import sharp from "sharp";
import { connectDB } from "@/lib/db/connect";
import Photo from "@/models/Photo";
import Event from "@/models/Event";
import { uploadFileToDrive } from "@/lib/drive/service";
import { isImageBlurry } from "@/lib/utils/blurDetection";
import { getSession } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

// POST /api/admin/events/[eventId]/upload
// Body: FormData with fields:
//   - files: File[] (multiple image files)
//   - category: string
//   - removeBlurry: "true" | "false"
//   - driveFolderId?: string (optional Drive folder to upload into)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await getSession();
  if (!session || session.eventId !== "admin") return err("Unauthorized", 401);

  const { eventId } = await params;

  const formData = await req.formData();
  const category = (formData.get("category") as string) || "General";
  const removeBlurry = formData.get("removeBlurry") === "true";
  const driveFolderId = (formData.get("driveFolderId") as string) || undefined;
  const files = formData.getAll("files") as File[];

  if (!files.length) return err("No files provided", 400);

  await connectDB();

  const event = await Event.findById(eventId);
  if (!event) return err("Event not found", 404);

  const existingCount = await Photo.countDocuments({ eventId });

  let uploaded = 0;
  let skipped = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const buffer = Buffer.from(await file.arrayBuffer());

    const blurry = await isImageBlurry(buffer);

    if (removeBlurry && blurry) {
      skipped++;
      continue;
    }

    const { id, thumbnailUrl, fullUrl } = await uploadFileToDrive(
      buffer,
      file.name,
      file.type,
      driveFolderId
    );

    const meta = await sharp(buffer).metadata();

    await Photo.create({
      eventId,
      driveFileId: id,
      thumbnailUrl,
      fullUrl,
      filename: file.name,
      width: meta.width,
      height: meta.height,
      aspectRatio: meta.width && meta.height ? meta.width / meta.height : undefined,
      isBlurry: blurry,
      category,
      order: existingCount + uploaded,
    });

    uploaded++;
  }

  const total = await Photo.countDocuments({ eventId });
  await Event.findByIdAndUpdate(eventId, { totalPhotos: total });

  return ok({ uploaded, skipped, total: files.length });
}
