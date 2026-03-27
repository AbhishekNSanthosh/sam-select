import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: SCOPES,
  });

  return google.drive({ version: "v3", auth });
}

export interface DriveFile {
  id: string;
  name: string;
  thumbnailUrl: string;
  fullUrl: string;
  width?: number;
  height?: number;
}

/**
 * List all image files inside a Drive folder
 */
export async function listFolderImages(folderId: string): Promise<DriveFile[]> {
  const drive = getDriveClient();

  const response = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    fields: "files(id, name, imageMediaMetadata, thumbnailLink, webContentLink)",
    pageSize: 1000,
    orderBy: "name",
  });

  const files = response.data.files ?? [];

  return files
    .filter((f) => f.id && f.name)
    .map((f) => ({
      id: f.id!,
      name: f.name!,
      thumbnailUrl: f.thumbnailLink?.replace("=s220", "=s400") ?? getThumbnailUrl(f.id!),
      fullUrl: getFullUrl(f.id!),
      width: f.imageMediaMetadata?.width ?? undefined,
      height: f.imageMediaMetadata?.height ?? undefined,
    }));
}

/**
 * Get a temporary signed thumbnail URL for a Drive file
 */
export function getThumbnailUrl(fileId: string, size = 400): string {
  return `https://lh3.googleusercontent.com/d/${fileId}=s${size}`;
}

/**
 * Get the full-resolution URL for a Drive file
 */
export function getFullUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * List all sub-folders inside a parent folder (one per event)
 */
export async function listEventFolders(
  parentFolderId: string
): Promise<Array<{ id: string; name: string }>> {
  const drive = getDriveClient();

  const response = await drive.files.list({
    q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    pageSize: 100,
  });

  return (response.data.files ?? [])
    .filter((f) => f.id && f.name)
    .map((f) => ({ id: f.id!, name: f.name! }));
}
