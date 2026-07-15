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
