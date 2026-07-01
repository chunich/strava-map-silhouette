import { NextResponse } from "next/server";
import { access, readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import sharp from "sharp";
import config from "@/config";

async function stitchSVGs(
  svgContents: Array<{ filename: string; content: string }>,
  outputPath: string,
  year: string,
) {
  // Grid layout: 5 images per row
  const MAX_WIDTH = 1000; // Maximum canvas width in pixels
  const CELL_SIZE = config.draw.width; // Use configured image size
  const SPACING = 0; // No spacing between images
  const HEADING_HEIGHT = 104; // Space for heading: 20px top + 64px text + 20px bottom
  const MAX_COLS = Math.floor(MAX_WIDTH / CELL_SIZE); // Calculate max columns that fit
  const COLS = Math.min(5, MAX_COLS); // Use 5 or less if constrained by MAX_WIDTH
  const rows = Math.ceil(svgContents.length / COLS);
  const actualCols = Math.min(COLS, svgContents.length); // Cap width to actual content
  const totalWidth = actualCols * CELL_SIZE;
  const totalHeight = rows * CELL_SIZE + HEADING_HEIGHT;

  console.log(
    `  Creating grid: ${COLS} cols × ${rows} rows (${totalWidth}×${totalHeight})`,
  );

  // Build combined SVG with dynamic year in title
  let combinedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">\n`;
  combinedSvg += `  <rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="#333"/>\n`;
  combinedSvg += `  <text x="20" y="96" text-anchor="start" font-family="Arial, sans-serif" font-size="64" fill="#ffffff">My Runs ${year}</text>\n`;

  svgContents.forEach((svg, index) => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const x = col * CELL_SIZE + SPACING;
    const y = row * CELL_SIZE + SPACING + HEADING_HEIGHT;

    // Extract content between <svg> tags (remove outer svg element)
    const contentMatch = svg.content.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
    if (contentMatch) {
      const innerContent = contentMatch[1];
      // Wrap in a group and translate to position
      combinedSvg += `  <g transform="translate(${x}, ${y})">\n`;
      combinedSvg += `    ${innerContent.trim()}\n`;
      combinedSvg += `  </g>\n`;
    }
  });

  combinedSvg += `</svg>`;

  // Save stitched SVG
  await writeFile(outputPath, combinedSvg, "utf-8");

  // Convert to PNG
  const pngPath = outputPath.replace(".svg", ".png");
  await sharp(Buffer.from(combinedSvg)).png().toFile(pngPath);

  console.log(`  PNG version created: ${basename(pngPath)}`);

  // Return summary for this year
  return {
    totalImages: svgContents.length,
    grid: {
      columns: COLS,
      rows: rows,
    },
    dimensions: {
      width: totalWidth,
      height: totalHeight,
    },
    svgFile: basename(outputPath),
    pngFile: basename(pngPath),
    success: true,
  };
}

export async function POST() {
  try {
    console.log("[POST /api/images/stitch] Starting stitch operation");

    // Check if output directory exists
    try {
      await access(config.paths.outputDir);
    } catch {
      return NextResponse.json(
        {
          error: "Output directory not found",
          path: config.paths.outputDir,
          hint: "You may need to run POST /api/images/generate first",
        },
        { status: 400 },
      );
    }

    // Read all SVG files in the directory
    const files = await readdir(config.paths.outputDir);
    const svgFiles = files
      .filter(
        (f) => f.toLowerCase().endsWith(".svg") && !f.startsWith("stitched_"),
      )
      .sort();

    if (svgFiles.length === 0) {
      return NextResponse.json(
        {
          error: "No SVG files found to stitch",
          directory: config.paths.outputDir,
          hint: "You may need to run POST /api/images/generate first",
        },
        { status: 404 },
      );
    }

    // Extract year from files and create a stitched image based on the year of the activities
    const years = svgFiles.map((f) => {
      const match = f.match(/(\d{4})/);
      return match ? match[1] : null;
    });

    const uniqueYears = [...new Set(years)].filter(
      (y) => y !== null,
    ) as string[];
    console.log(`Found SVG files from years: ${uniqueYears.join(", ")}`);

    if (uniqueYears.length === 0) {
      return NextResponse.json(
        {
          error: "No valid year found in SVG filenames",
          hint: "SVG filenames should contain a 4-digit year (e.g., 2025)",
        },
        { status: 400 },
      );
    }

    const results = [];

    for (const year of uniqueYears) {
      try {
        console.log(`Processing year: ${year}`);
        const yearSvgFiles = svgFiles.filter((f) => f.includes(year));
        console.log(
          `  Found ${yearSvgFiles.length} SVG file(s) for year ${year}`,
        );

        // Read all SVG contents for this year
        const svgContents = await Promise.all(
          yearSvgFiles.map(async (file) => {
            const filePath = join(config.paths.outputDir, file);
            const content = await readFile(filePath, "utf-8");
            return { filename: file, content };
          }),
        );

        // Stitch images for this year
        const stitchedFilename = `stitched_${year}.svg`;
        const stitchedPath = join(config.paths.outputDir, stitchedFilename);
        const summary = await stitchSVGs(svgContents, stitchedPath, year);

        console.log(`  Stitched image created: ${stitchedFilename}`);
        results.push({
          year,
          filename: stitchedFilename,
          imageCount: yearSvgFiles.length,
          ...summary,
        });
      } catch (error) {
        console.error(
          `[POST /api/images/stitch] Error stitching year ${year}:`,
          error,
        );
        results.push({
          year,
          error: error instanceof Error ? error.message : String(error),
          success: false,
        });
      }
    }

    // Send consolidated response
    const successful = results.filter((r) => !r.error).length;
    const failed = results.filter((r) => r.error).length;

    return NextResponse.json({
      message: "Stitch operation complete",
      summary: {
        totalYears: uniqueYears.length,
        successful,
        failed,
      },
      results,
    });
  } catch (error) {
    console.error("[POST /api/images/stitch] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to stitch images",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
