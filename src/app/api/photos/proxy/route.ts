import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/utils/session";
import { err } from "@/lib/utils/response";

// GET /api/photos/proxy?url=...
// Proxies an image from Google Drive CDN, adding correct CORS headers.
// Used by the face-recognition client for cross-origin canvas operations.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return err("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) return err("url is required", 400);

  // Only allow proxying Google Drive / GCS CDN URLs
  const allowed = ["lh3.googleusercontent.com", "drive.google.com", "storage.googleapis.com"];
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return err("Invalid URL", 400);
  }
  if (!allowed.some((h) => hostname.endsWith(h))) {
    return err("Forbidden URL", 403);
  }

  const upstream = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 SamSelect/1.0" },
  });

  if (!upstream.ok) {
    return err("Could not fetch image", 502);
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
