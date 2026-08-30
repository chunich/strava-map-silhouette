import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import config from "@/config";
import { parseTCX } from "@/src/tcxParser";
import { parseGPX } from "@/src/gpxParser";
import { parseFIT } from "@/src/fitParser";

const ALLOWED_EXTENSIONS = new Set([".gpx", ".tcx", ".fit"]);

type ParsedActivity = {
  metrics?: Record<string, unknown>;
};

// POST /api/images/refresh-metadata
// Re-parses all source files and overwrites only the JSON metadata sidecars —
// SVG files are never touched. Use this after parser updates to pick up new
// metric fields without re-rendering every silhouette.
export async function POST() {
  try {
    // 1. Scan sourceDir for source files
    let sourceEntries: string[];
    try {
      sourceEntries = await readdir(config.paths.sourceDir);
    } catch {
      return NextResponse.json(
        { error: "Source directory not found", path: config.paths.sourceDir },
        { status: 400 },
      );
    }

    // Build map: sourceBaseName (no extension) → full absolute path
    const sourceMap = new Map<string, string>();
    for (const entry of sourceEntries) {
      const ext = path.extname(entry).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) continue;
      const baseName = path.basename(entry, ext);
      sourceMap.set(baseName, path.join(config.paths.sourceDir, entry));
    }

    // 2. Scan outputDir for JSON sidecar files
    let outputEntries: string[];
    try {
      outputEntries = await readdir(config.paths.outputDir);
    } catch {
      return NextResponse.json(
        { error: "Output directory not found", path: config.paths.outputDir },
        { status: 400 },
      );
    }

    const jsonFiles = outputEntries.filter(
      (f) =>
        f.toLowerCase().endsWith(".json") &&
        !f.toLowerCase().startsWith("stitched_"),
    );

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const jsonFilename of jsonFiles) {
      const jsonPath = path.join(config.paths.outputDir, jsonFilename);
      try {
        // Derive the source baseName: output format is "{date}_{name}_{sourceBaseName}.json"
        // Find whichever source baseName this JSON's stem ends with.
        const stem = path.basename(jsonFilename, ".json");
        let matchedSourcePath: string | null = null;

        for (const [baseName, sourcePath] of sourceMap) {
          if (stem.endsWith("_" + baseName)) {
            matchedSourcePath = sourcePath;
            break;
          }
        }

        if (!matchedSourcePath) {
          skipped++;
          continue;
        }

        // Preserve existing titleLabel
        let existingTitleLabel: string | undefined;
        try {
          const raw = await readFile(jsonPath, "utf-8");
          const existing = JSON.parse(raw) as Record<string, unknown>;
          if (typeof existing.titleLabel === "string") {
            existingTitleLabel = existing.titleLabel;
          }
        } catch {
          // Unreadable or missing — proceed without titleLabel
        }

        // Re-parse source file
        const ext = path.extname(matchedSourcePath).toLowerCase();
        let activity: ParsedActivity | null = null;

        if (ext === ".fit") {
          const buffer = await readFile(matchedSourcePath);
          activity = (await parseFIT(buffer)) as ParsedActivity;
        } else if (ext === ".tcx") {
          const content = await readFile(matchedSourcePath, "utf-8");
          activity = parseTCX(content) as ParsedActivity;
        } else if (ext === ".gpx") {
          const content = await readFile(matchedSourcePath, "utf-8");
          activity = parseGPX(content) as ParsedActivity;
        }

        if (!activity) {
          skipped++;
          continue;
        }

        // Write updated sidecar (SVG untouched)
        const metadata: Record<string, unknown> = {};
        if (existingTitleLabel != null)
          metadata.titleLabel = existingTitleLabel;
        if (activity.metrics != null) metadata.metrics = activity.metrics;

        await writeFile(jsonPath, JSON.stringify(metadata, null, 2), "utf-8");
        updated++;
      } catch (error) {
        console.error(
          `[refresh-metadata] Error on ${jsonFilename}:`,
          error instanceof Error ? error.message : error,
        );
        failed++;
      }
    }

    console.log(
      `[POST /api/images/refresh-metadata] Done: ${updated} updated, ${skipped} skipped, ${failed} failed`,
    );

    return NextResponse.json({
      message: "Metadata refresh complete",
      summary: {
        total: jsonFiles.length,
        updated,
        skipped,
        failed,
      },
    });
  } catch (error) {
    console.error("[POST /api/images/refresh-metadata] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to refresh metadata",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
