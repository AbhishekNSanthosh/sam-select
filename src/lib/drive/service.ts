import { google } from "googleapis";
import { Readable } from "stream";

const SCOPES = [
  "https://www.googleapis.com/auth/drive",
];

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
      thumbnailUrl: getThumbnailUrl(f.id!),
      fullUrl: getFullUrl(f.id!),
      width: f.imageMediaMetadata?.width ?? undefined,
      height: f.imageMediaMetadata?.height ?? undefined,
    }));
}

/**
 * Public thumbnail URL for a Drive file (works after grantPublicAccess)
 */
export function getThumbnailUrl(fileId: string, size = 400): string {
  return `https://lh3.googleusercontent.com/d/${fileId}=s${size}`;
}

/**
 * Public full-resolution URL for a Drive file
 */
export function getFullUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * Grant anyone-with-the-link read access to a Drive file.
 * Call this after uploading or syncing a file so the browser can load it directly.
 */
export async function grantPublicAccess(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
    // suppress the email notification Drive would otherwise send
    sendNotificationEmail: false,
  });
}

/**
 * Upload a file buffer to Google Drive and return its URLs
 */
export async function uploadFileToDrive(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  folderId?: string
): Promise<{ id: string; thumbnailUrl: string; fullUrl: string }> {
  const drive = getDriveClient();

  const createRes = await drive.files.create({
    media: { mimeType, body: Readable.from(buffer) },
    requestBody: {
      name: filename,
      parents: folderId ? [folderId] : [],
    },
    fields: "id",
  });

  const id = createRes.data.id!;

  // Make the file publicly readable so browsers can load it directly
  await grantPublicAccess(id);

  return {
    id,
    thumbnailUrl: getThumbnailUrl(id),
    fullUrl: getFullUrl(id),
  };
}

/**
 * Get the name of a Drive folder by its ID
 */
export async function getFolderName(folderId: string): Promise<string | null> {
  const drive = getDriveClient();
  const res = await drive.files.get({ fileId: folderId, fields: "name" });
  return res.data.name ?? null;
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
