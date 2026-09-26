import { access, mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import config from "@/config";
import type { ImageMetadata } from "@/lib/api-types";

function parseMetadata(content: string): ImageMetadata {
  const parsed = JSON.parse(content) as Record<string, unknown>;
  const metadata: ImageMetadata = {};

  if (typeof parsed.titleLabel === "string") {
    metadata.titleLabel = parsed.titleLabel;
  }

  if (
    typeof parsed.metrics === "object" &&
    parsed.metrics !== null &&
    !Array.isArray(parsed.metrics)
  ) {
    const metrics = parsed.metrics as Record<string, unknown>;
    metadata.metrics = {
      activityTime:
        typeof metrics.activityTime === "number" ? metrics.activityTime : null,
      elapsedTime:
        typeof metrics.elapsedTime === "number" ? metrics.elapsedTime : null,
      totalTime:
        typeof metrics.totalTime === "number" ? metrics.totalTime : null,
      avgHeartRate:
        typeof metrics.avgHeartRate === "number" ? metrics.avgHeartRate : null,
      maxHeartRate:
        typeof metrics.maxHeartRate === "number" ? metrics.maxHeartRate : null,
      totalAscent:
        typeof metrics.totalAscent === "number" ? metrics.totalAscent : null,
      totalDescent:
        typeof metrics.totalDescent === "number" ? metrics.totalDescent : null,
      bestMileSeconds:
        typeof metrics.bestMileSeconds === "number"
          ? metrics.bestMileSeconds
          : null,
      best1MileSeconds:
        typeof metrics.best1MileSeconds === "number"
          ? metrics.best1MileSeconds
          : null,
      best5KSeconds:
        typeof metrics.best5KSeconds === "number"
          ? metrics.best5KSeconds
          : null,
      best10KSeconds:
        typeof metrics.best10KSeconds === "number"
          ? metrics.best10KSeconds
          : null,
      best10MileSeconds:
        typeof metrics.best10MileSeconds === "number"
          ? metrics.best10MileSeconds
          : null,
      best20KSeconds:
        typeof metrics.best20KSeconds === "number"
          ? metrics.best20KSeconds
          : null,
      bestHalfSeconds:
        typeof metrics.bestHalfSeconds === "number"
          ? metrics.bestHalfSeconds
          : null,
      best25KSeconds:
        typeof metrics.best25KSeconds === "number"
          ? metrics.best25KSeconds
          : null,
      best30KSeconds:
        typeof metrics.best30KSeconds === "number"
          ? metrics.best30KSeconds
          : null,
      best35KSeconds:
        typeof metrics.best35KSeconds === "number"
          ? metrics.best35KSeconds
          : null,
      best40KSeconds:
        typeof metrics.best40KSeconds === "number"
          ? metrics.best40KSeconds
          : null,
      bestMarathonSeconds:
        typeof metrics.bestMarathonSeconds === "number"
          ? metrics.bestMarathonSeconds
          : null,
    };
  }

  return metadata;
}

/**
 * GET /images
 * List all SVG images in the output directory in ordinary alphabetical order
 * Exclude stitched_*.svg files which are intermediate files used for stitching
 */
export async function GET() {
  try {
    console.log("[GET /api/images] Requested");

    try {
      await access(config.paths.outputDir);
    } catch {
      await mkdir(config.paths.outputDir, { recursive: true });
    }

    const files = await readdir(config.paths.outputDir);
    const svgFiles = files
      .filter(
        (file) =>
          file.toLowerCase().endsWith(".svg") &&
          !file.toLowerCase().includes("stitched_"),
      )
      .sort();

    const images = await Promise.all(
      svgFiles.map(async (filename) => {
        const metadataFilename = filename.replace(/\.svg$/i, ".json");
        const metadataPath = path.join(
          config.paths.outputDir,
          metadataFilename,
        );

        try {
          const metadataContent = await readFile(metadataPath, "utf-8");
          return {
            filename,
            metadata: parseMetadata(metadataContent),
          };
        } catch {
          return { filename };
        }
      }),
    );

    return NextResponse.json({
      images,
    });
  } catch (error) {
    console.error("[GET /api/images] Error:", error);

    return NextResponse.json(
      {
        error: "Failed to list images",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
