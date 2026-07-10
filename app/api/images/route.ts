import { access, mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import config from "@/config";

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
        const metadataPath = path.join(config.paths.outputDir, metadataFilename);

        try {
          const metadataContent = await readFile(metadataPath, "utf-8");
          return {
            filename,
            metadata: JSON.parse(metadataContent) as {
              titleLabel?: string;
            },
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
