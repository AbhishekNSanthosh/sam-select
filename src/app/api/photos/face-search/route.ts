import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Photo from "@/models/Photo";
import { getSession } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

// POST /api/photos/face-search
// Body: { eventId, queryDescriptors: number[][] }  — accept 1..N descriptors for robustness
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return err("Unauthorized", 401);

  const body = await req.json();
  const { eventId, queryDescriptor, queryDescriptors } = body;

  // Accept both single queryDescriptor (legacy) and queryDescriptors array
  const descriptors: number[][] = (queryDescriptors ?? (queryDescriptor ? [queryDescriptor] : null));

  if (
    !eventId ||
    !Array.isArray(descriptors) ||
    descriptors.length === 0 ||
    descriptors.some((d) => !Array.isArray(d) || d.length !== 128)
  ) {
    return err("eventId and queryDescriptors (array of 128-element arrays) are required", 400);
  }

  if (session.eventId !== "admin" && session.eventId !== eventId) {
    return err("Forbidden", 403);
  }

  await connectDB();

  const photosWithFaces = await Photo.find(
    { eventId, "faceDescriptors.0": { $exists: true } },
    {
      faceDescriptors: 1,
      thumbnailUrl: 1,
      fullUrl: 1,
      filename: 1,
      width: 1,
      height: 1,
      aspectRatio: 1,
      category: 1,
      order: 1,
      isBlurry: 1,
      popularity: 1,
      createdAt: 1,
      driveFileId: 1,
    }
  ).lean();

  // ─── Euclidean distance ─────────────────────────────────────────────────────
  function euclidean(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < 128; i++) {
      const d = a[i] - b[i];
      sum += d * d;
    }
    return Math.sqrt(sum);
  }

  // ─── For a photo, compute the best (minimum) distance across all query
  //     descriptors AND all stored descriptors.  This makes matching robust
  //     even when the user uploads a slightly angled selfie.
  function bestDistance(storedDescriptors: number[][]): number {
    let best = Infinity;
    for (const qd of descriptors) {
      for (const sd of storedDescriptors) {
        const d = euclidean(qd, sd);
        if (d < best) best = d;
      }
    }
    return best;
  }

  // ─── Thresholds ─────────────────────────────────────────────────────────────
  // face-api SSD + ResNet distance interpretation:
  //   < 0.40  excellent match (same person, good lighting)
  //   < 0.50  very likely same person
  //   < 0.60  possible match — too many false positives above this
  const THRESHOLD = 0.44;

  const matches: { photo: unknown; distance: number }[] = [];

  for (const photo of photosWithFaces) {
    const storedDescriptors = photo.faceDescriptors as number[][];
    const dist = bestDistance(storedDescriptors);
    if (dist < THRESHOLD) {
      matches.push({ photo, distance: dist });
    }
  }

  // Sort closest-first
  matches.sort((a, b) => a.distance - b.distance);

  return ok({
    photos: matches.map((m) => m.photo),
    total: matches.length,
    threshold: THRESHOLD,
  });
}
