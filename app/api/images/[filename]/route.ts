import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import config from "@/config";

/**
 * GET /api/images/:filename
 * Get the generated image asset by its filename
 * Example: /api/images/2025-11-28_Cook_County_Run_473613929614966789.svg
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> | { filename: string } },
) {
  let filename = "";

  try {
    ({ filename } = await Promise.resolve(params));
    console.log(`[GET /api/images/${filename}] Requested`);

    if (!filename) {
      return NextResponse.json(
        {
          error: "Missing filename",
          message: "Filename route parameter is required",
        },
        { status: 400 },
      );
    }

    // Validate filename
    const lower = filename.toLowerCase();
    if (!lower.endsWith(".svg") && !lower.endsWith(".png")) {
      return NextResponse.json(
        {
          error: "Invalid filename",
          message: "Filename must end with .svg or .png",
        },
        { status: 400 },
      );
    }

    // Check if SVG or PNG file exists in output directory
    const filePath = path.join(config.paths.outputDir, filename);
    try {
      await access(filePath);
    } catch {
      return NextResponse.json(
        {
          error: "File not found",
          filename,
          path: filePath,
          hint: "You may need to run POST /api/images/generate first",
        },
        { status: 404 },
      );
    }

    // Build ETag from size + mtime (no need to hash file contents)
    const fileStat = await stat(filePath);
    const etag = `"${fileStat.size}-${fileStat.mtimeMs}"`;
    const lastModified = fileStat.mtime.toUTCString();

    // Conditional GET: return 304 if client already has the current version
    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Last-Modified": lastModified,
          "Cache-Control": "no-cache",
        },
      });
    }

    const cacheHeaders = {
      ETag: etag,
      "Last-Modified": lastModified,
      // no-cache: revalidate on every request, but allow 304 shortcut
      "Cache-Control": "no-cache",
    };

    // PNG files are served directly as binary
    if (lower.endsWith(".png")) {
      // Serve PNG file
      const pngBuffer = await readFile(filePath);
      return new NextResponse(pngBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `inline; filename="${filename}"`,
          ...cacheHeaders,
        },
      });
    }

    // Read and return the SVG file
    const svgString = await readFile(filePath, "utf-8");

    // Set response headers for SVG
    return new NextResponse(svgString, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `inline; filename="${filename}"`,
        ...cacheHeaders,
      },
    });
  } catch (error) {
    console.error(`[GET /api/images/${filename || "unknown"}] Error:`, error);

    return NextResponse.json(
      {
        error: "Failed to retrieve image",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
