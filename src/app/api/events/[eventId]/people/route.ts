import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Photo from "@/models/Photo";
import Event from "@/models/Event";
import { getSession } from "@/lib/utils/session";
import { ok, err } from "@/lib/utils/response";

function euclideanDistance(desc1: number[], desc2: number[]): number {
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);

    const { eventId } = await params;
    
    // Authorization check
    if (session.eventId !== "admin" && session.eventId !== eventId) {
      return err("Forbidden", 403);
    }

    await connectDB();

    const event = await Event.findById(eventId).lean();
    if (!event) {
      return err("Event not found", 404);
    }

    const photos = await Photo.find({
      eventId,
      faceDescriptors: { $exists: true, $not: { $size: 0 } },
    }).lean();

    const clusters: {
      id: string;
      representativePhoto: any;
      photoIds: Set<string>;
      descriptors: number[][];
    }[] = [];

    // 0.55 is an optimal threshold for SSD MobileNetv1 facial recognition where 
    // < 0.4 is perfectly identical, < 0.55 is very likely identical but varying angles/lighting
    const THRESHOLD = 0.55; 

    for (const photo of photos as any[]) {
      if (!photo.faceDescriptors?.length) continue;

      for (const descriptor of photo.faceDescriptors) {
        let matchedCluster: typeof clusters[0] | null = null;
        let minOverallDistance = Infinity;

        // Find the best matching cluster based on the closest similarity to any face in that group
        for (const cluster of clusters) {
          for (const sd of cluster.descriptors) {
            const d = euclideanDistance(descriptor, sd);
            if (d < minOverallDistance) {
              minOverallDistance = d;
              matchedCluster = cluster;
            }
          }
        }

        if (minOverallDistance < THRESHOLD && matchedCluster) {
          matchedCluster.photoIds.add(photo._id.toString());
          // Save the face variation so the AI can match subsequent photos of the same person from even more difficult angles!
          matchedCluster.descriptors.push(descriptor);
        } else {
          // Create new cluster
          clusters.push({
            id: photo._id.toString() + "-" + Math.random().toString(36).substr(2, 5),
            representativePhoto: {
              _id: photo._id.toString(),
              thumbnailUrl: photo.thumbnailUrl,
              filename: photo.filename,
              width: photo.width,
              height: photo.height,
            },
            photoIds: new Set([photo._id.toString()]),
            descriptors: [descriptor],
          });
        }
      }
    }

    // Filter, sort by size, and slice for UI
    const clientClusters = clusters
      .filter((c) => c.photoIds.size >= 1) // Lowered to 1 so it always shows up in test/small albums
      .sort((a, b) => b.photoIds.size - a.photoIds.size)
      .slice(0, 15) // Top 15 people to keep UI clean
      .map((c) => ({
        id: c.id,
        photoCount: c.photoIds.size,
        photoIds: Array.from(c.photoIds),
        representativePhoto: c.representativePhoto,
      }));

    return ok(clientClusters);
  } catch (error: any) {
    console.error("People grouping error:", error);
    return err(error.message, 500);
  }
}
