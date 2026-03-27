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

    // Grouping
    const clusters: {
      id: string;
      representativePhoto: any;
      photoIds: Set<string>;
      descriptors: number[][];
    }[] = [];

    const THRESHOLD = 0.40; // Extremely strict for "precise exact faces"

    for (const photo of photos as any[]) {
      if (!photo.faceDescriptors?.length) continue;

      for (const descriptor of photo.faceDescriptors) {
        let matchedCluster: typeof clusters[0] | null = null;
        let minOverallDistance = Infinity;

        // Find the best matching cluster
        for (const cluster of clusters) {
          // Compare ONLY against the "anchor" face (first descriptor) to avoid 
          // "chaining" where completely differently looking people get accidentally chained into the same group.
          const anchorDescriptor = cluster.descriptors[0];
          const d = euclideanDistance(descriptor, anchorDescriptor);
          
          if (d < minOverallDistance) {
            minOverallDistance = d;
            matchedCluster = cluster;
          }
        }

        if (minOverallDistance < THRESHOLD && matchedCluster) {
          matchedCluster.photoIds.add(photo._id.toString());
          // No need to store all descriptors anymore, since we only compare against the anchor!
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
