import { NextRequest } from "next/server";
import { getSession } from "@/lib/utils/session";
import { createDriveFolder } from "@/lib/drive/service";
import { ok, err } from "@/lib/utils/response";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.eventId !== "admin") return err("Unauthorized", 401);

  try {
    const { name, parentId } = await req.json();
    if (!name) return err("Folder name is required", 400);

    const folderId = await createDriveFolder(name, parentId);
    return ok({ folderId });
  } catch (error: any) {
    console.error("Failed to create folder:", error);
    return err("Failed to create folder in Google Drive", 500);
  }
}
