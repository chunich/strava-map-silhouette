#!/usr/bin/env node
/**
 * One-time backfill: pushes existing output_files/*.json + .samples.json
 * (plus re-parsed polyline + raw source file from source_files/) into
 * Supabase. Run locally (source_files/ is gitignored and only exists
 * locally) after creating a Supabase project, running supabase/schema.sql,
 * and setting SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.
 *
 * Usage: node scripts/backfillToSupabase.js
 */
const fs = require("fs").promises;
const path = require("path");
const config = require("../config");
const { parseGPX } = require("../src/gpxParser");
const { parseTCX } = require("../src/tcxParser");
const { parseFIT } = require("../src/fitParser");
const { activityToGeoJSON } = require("../src/geoJsonConverter");
const {
  isSupabaseConfigured,
  syncRunToSupabase,
} = require("../src/supabaseSync");

const ALLOWED_SOURCE_EXTENSIONS = new Set([".gpx", ".tcx", ".fit"]);

async function findMatchingSourceFile(stem) {
  let entries;
  try {
    entries = await fs.readdir(config.paths.sourceDir);
  } catch {
    return null;
  }

  for (const entry of entries) {
    const ext = path.extname(entry).toLowerCase();
    if (!ALLOWED_SOURCE_EXTENSIONS.has(ext)) continue;
    const baseName = path.basename(entry, ext);
    if (stem.endsWith(`_${baseName}`)) {
      return path.join(config.paths.sourceDir, entry);
    }
  }
  return null;
}

async function extractPolyline(sourcePath) {
  const ext = path.extname(sourcePath).toLowerCase();
  const fileContent =
    ext === ".fit"
      ? await fs.readFile(sourcePath)
      : await fs.readFile(sourcePath, "utf-8");

  let polyline = [];
  if (ext === ".tcx") {
    const activity = parseTCX(fileContent);
    polyline = (activity.coordinates || []).map(([lng, lat]) => ({ lng, lat }));
  } else if (ext === ".fit") {
    const activity = await parseFIT(fileContent);
    polyline = (activity.coordinates || []).map(([lng, lat]) => ({ lng, lat }));
  } else if (ext === ".gpx") {
    const geoJSON = activityToGeoJSON({ gpxContent: fileContent });
    const line = (geoJSON?.features || []).find(
      (f) => f.geometry && f.geometry.type === "LineString",
    );
    if (line) {
      polyline = line.geometry.coordinates.map(([lng, lat]) => ({ lng, lat }));
    }
  }

  return { polyline, fileContent, ext };
}

async function main() {
  if (!isSupabaseConfigured()) {
    console.error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first.",
    );
    process.exit(1);
  }

  const files = await fs.readdir(config.paths.outputDir);
  const svgFiles = files
    .filter(
      (f) =>
        f.toLowerCase().endsWith(".svg") &&
        !f.toLowerCase().includes("stitched_"),
    )
    .sort();

  console.log(`Found ${svgFiles.length} run(s) in ${config.paths.outputDir}`);

  let succeeded = 0;
  let failed = 0;
  let missingSource = 0;

  for (const [index, filename] of svgFiles.entries()) {
    const stem = filename.replace(/\.svg$/i, "");
    process.stdout.write(`[${index + 1}/${svgFiles.length}] ${filename}... `);

    try {
      const metadataPath = path.join(config.paths.outputDir, `${stem}.json`);
      const samplesPath = path.join(
        config.paths.outputDir,
        `${stem}.samples.json`,
      );
      const svgPath = path.join(config.paths.outputDir, filename);

      const svgContent = await fs.readFile(svgPath, "utf-8");
      const metadata = JSON.parse(await fs.readFile(metadataPath, "utf-8"));

      let distanceTimeSamples = [];
      try {
        distanceTimeSamples = JSON.parse(
          await fs.readFile(samplesPath, "utf-8"),
        );
      } catch {
        // No samples sidecar for this run; proceed without pace data.
      }

      const sourcePath = await findMatchingSourceFile(stem);
      let polyline = [];
      let rawFileContent = Buffer.from(svgContent, "utf-8");
      let rawFileExt = ".svg";

      if (sourcePath) {
        const extracted = await extractPolyline(sourcePath);
        polyline = extracted.polyline;
        rawFileContent = Buffer.isBuffer(extracted.fileContent)
          ? extracted.fileContent
          : Buffer.from(extracted.fileContent, "utf-8");
        rawFileExt = extracted.ext;
      } else {
        missingSource += 1;
      }

      // Date + activity type are embedded in the filename prefix:
      // YYYY-MM-DD_ACTIVITY_TYPE_SOURCEID.svg
      const dateMatch = stem.match(/^(\d{4}-\d{2}-\d{2})_(.+?)_[^_]+$/);
      const activityDate = dateMatch ? dateMatch[1] : null;
      const activityType = dateMatch ? dateMatch[2] : "Unknown";

      await syncRunToSupabase({
        filename,
        activityType,
        activityDate,
        titleLabel: metadata.titleLabel || "",
        metrics: metadata.metrics || {},
        svgContent,
        rawFileContent,
        rawFileExt,
        distanceTimeSamples,
        points: polyline,
      });

      succeeded += 1;
      console.log("done");
    } catch (error) {
      failed += 1;
      console.log(`FAILED: ${error.message}`);
    }
  }

  console.log(
    `\nBackfill complete. Succeeded: ${succeeded}, Failed: ${failed}, Missing source file (no polyline): ${missingSource}`,
  );
}

main().catch((error) => {
  console.error("Backfill script crashed:", error);
  process.exit(1);
});
