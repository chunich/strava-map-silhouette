import { writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import config from "@/config";
import { processFileActivities } from "@/src/processFileActivities";

const ALLOWED_EXTENSIONS = new Set([".gpx", ".tcx", ".fit"]);
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
// Allowlist: alphanumeric, dash, underscore, dot — no path separators
const SAFE_FILENAME_RE = /^[A-Za-z0-9._-]+$/;

function sanitizeFilename(raw: string): string | null {
  // Take only the basename to strip any directory components
  const base = path.basename(raw);
  if (!SAFE_FILENAME_RE.test(base)) return null;
  const ext = path.extname(base).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return null;
  return base;
}

// POST /api/images/upload-and-process
export async function POST(request: Request) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid request", message: "Expected multipart/form-data" },
        { status: 400 },
      );
    }

    const entries = formData.getAll("files");
    if (entries.length === 0) {
      return NextResponse.json(
        {
          error: "No files provided",
          message: "Include at least one file under the 'files' field",
        },
        { status: 400 },
      );
    }

    const savedPaths: string[] = [];
    const rejections: string[] = [];

    for (const entry of entries) {
      if (!(entry instanceof File)) {
        rejections.push(`"${String(entry)}" — not a file`);
        continue;
      }

      const safeFilename = sanitizeFilename(entry.name);
      if (!safeFilename) {
        rejections.push(`"${entry.name}" — invalid name or extension`);
        continue;
      }

      if (entry.size > MAX_FILE_SIZE_BYTES) {
        rejections.push(`"${safeFilename}" — exceeds 50 MB limit`);
        continue;
      }

      const destPath = path.join(config.paths.sourceDir, safeFilename);
      const buffer = Buffer.from(await entry.arrayBuffer());
      await writeFile(destPath, buffer);
      savedPaths.push(destPath);
    }

    if (savedPaths.length === 0) {
      return NextResponse.json(
        {
          error: "No valid files to process",
          message: rejections.join("; "),
        },
        { status: 400 },
      );
    }

    console.log(
      `[POST /api/images/upload-and-process] Processing ${savedPaths.length} file(s) with force=true`,
    );

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
      force: true,
    };

    const results = await processFileActivities(
      savedPaths,
      config.paths.outputDir,
      options,
    );

    const successful = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "error").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    console.log(
      `[POST /api/images/upload-and-process] Done: ${successful} ok, ${failed} failed, ${skipped} skipped`,
    );

    return NextResponse.json({
      message: "Upload and processing complete",
      summary: {
        total: results.length,
        successful,
        failed,
        skipped,
      },
      results: results.map((r) => ({
        gpxFile: path.basename(r.gpxFile ?? ""),
        success: r.status === "success",
        outputImage: r.outputImage ? path.basename(r.outputImage) : null,
        error: r.error ?? null,
      })),
    });
  } catch (error) {
    console.error("[POST /api/images/upload-and-process] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to process uploaded files",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
