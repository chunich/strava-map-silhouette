import { access, readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import config from "@/config";
import { processFileActivities } from "@/src/processFileActivities";

// POST /api/images/generate
export async function POST() {
  try {
    console.log(
      `[POST /api/images/generate] Starting generation from ${config.paths.sourceDir} with filter type "${config.filter.type}"`,
    );

    try {
      await access(config.paths.sourceDir);
    } catch {
      return NextResponse.json(
        {
          error: "Source directory not found",
          path: config.paths.sourceDir,
        },
        { status: 400 },
      );
    }

    const files = await readdir(config.paths.sourceDir);
    const gpxFiles = files
      .filter(
        (file) =>
          file.toLowerCase().endsWith(".gpx") ||
          file.toLowerCase().endsWith(".tcx") ||
          file.toLowerCase().endsWith(".fit"),
      )
      .sort()
      .map((file) => path.join(config.paths.sourceDir, file));

    if (gpxFiles.length === 0) {
      return NextResponse.json(
        {
          error: "No GPX/TCX/FIT files found",
          directory: config.paths.sourceDir,
        },
        { status: 404 },
      );
    }

    console.log(`Found ${gpxFiles.length} GPX/TCX/FIT file(s)`);

    const options = {
      filterType: config.filter.type,
      minimumDistance: config.filter.minimumDistance,
      width: config.draw.width,
      height: config.draw.height,
      colors: config.draw.colors,
      strokeWidth: config.draw.strokeWidth,
      aspectRatio: config.draw.aspectRatio,
      offsetX: config.draw.offsetX,
      offsetY: config.draw.offsetY,
      verbose: false,
    };

    const results = await processFileActivities(
      gpxFiles,
      config.paths.outputDir,
      options,
    );

    const successful = results.filter(
      (result) => result.status === "success",
    ).length;
    const failed = results.filter((result) => result.status === "error").length;
    const skipped = results.filter(
      (result) => result.status === "skipped",
    ).length;
    const skippedTypes = results
      .filter((result) => result.status === "skipped")
      .map((result) => result.type);

    console.log("[POST /api/images/generate] Complete. Summary:");
    console.log(`  ${successful} successful`);
    console.log(`  ${failed} failed`);
    console.log(`  ${skipped} skipped`);
    console.log(
      `  Skipped activity types: ${[...new Set(skippedTypes)].join(", ")}`,
    );

    return NextResponse.json({
      message: "Image generation complete",
      summary: {
        total: results.length,
        successful,
        failed,
        skipped,
      },
      results: results.map((result) => ({
        gpxFile: path.basename(result.gpxFile),
        success: result.status === "success",
        outputImage: result.outputImage
          ? path.basename(result.outputImage)
          : null,
        error: result.error || null,
      })),
    });
  } catch (error) {
    console.error("[POST /api/images/generate] Error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate images",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
