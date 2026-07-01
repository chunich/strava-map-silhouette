import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import config from "@/config";

/**
 * GET /api/images/:filename
 * Get the SVG image by its generated filename
 * Example: /api/images/2025-11-28_Cook_County_Run_473613929614966789.svg
 */
export async function GET(
  _req: Request,
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
    if (
      !filename.toLowerCase().endsWith(".svg") &&
      !filename.toLowerCase().endsWith(".SVG") &&
      !filename.toLowerCase().endsWith(".png") &&
      !filename.toLowerCase().endsWith(".PNG")
    ) {
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

    // PNG files are served directly as binary
    if (filename.toLowerCase().endsWith(".png")) {
      // Serve PNG file
      const pngBuffer = await readFile(filePath);
      return new NextResponse(pngBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `inline; filename="${filename}"`,
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
