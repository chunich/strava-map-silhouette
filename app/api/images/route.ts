import { access, mkdir, readdir } from "node:fs/promises";
import { NextResponse } from "next/server";
import config from "@/config";

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

    return NextResponse.json({
      images: svgFiles,
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
