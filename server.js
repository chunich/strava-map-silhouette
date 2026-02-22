const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const sharp = require("sharp");
const config = require("./config");
const { processFileActivities } = require("./src/processFileActivities");
const { StravaClient, activitiesToTracks } = require("./src/stravaService");
const { tracksToSVG } = require("./src/tracksDrawer");

const client = new StravaClient({
  clientId: config.strava.clientId || "CLIENT_ID",
  clientSecret: config.strava.clientSecret || "CLIENT_SECRET",
  accessToken: config.strava.accessToken || "CURRENT_ACCESS_TOKEN",
  refreshToken: config.strava.refreshToken || "CURRENT_REFRESH_TOKEN",
  expiresAt: config.strava.expiresAt || 1234567890, // Unix timestamp
  onTokenRefresh: async (newTokens) => {
    // Save new tokens to database/file
    console.log("Tokens refreshed:", newTokens);
    // await saveTokens(newTokens);
  },
});

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve static files (for demo.html and other assets)
app.use(express.static(__dirname));

/** GET /images
 * List all generated SVG images in the output directory
 */
app.get("/images", async (req, res) => {
  try {
    console.log(`[GET /images] Requested`);

    // Check if output directory exists;
    // Create if not
    try {
      await fs.access(config.paths.outputDir);
    } catch (error) {
      await fs.mkdir(config.paths.outputDir, { recursive: true });
    }

    // Read all .svg files in the directory
    const files = await fs.readdir(config.paths.outputDir);
    const svgFiles = files
      .filter(
        (f) =>
          f.toLowerCase().endsWith(".svg") &&
          f.toLocaleLowerCase().indexOf("stitched_") === -1,
      )
      .sort();

    res.json({
      images: svgFiles,
    });
  } catch (error) {
    console.error("[GET /images] Error:", error);
    res.status(500).json({
      error: "Failed to list images",
      message: error.message,
    });
  }
});

/**
 * POST /images/stitch
 * Stitch all generated SVG images into one combined image.
 * Arranges images in a grid with 5 images per row
 */
app.post("/images/stitch", async (req, res) => {
  try {
    console.log("[POST /images/stitch] Starting stitch operation");

    // Check if output directory exists
    try {
      await fs.access(config.paths.outputDir);
    } catch (error) {
      return res.status(400).json({
        error: "Output directory not found",
        path: config.paths.outputDir,
        hint: "You may need to run POST /images/generate first",
      });
    }

    // Read all SVG files in the directory
    const files = await fs.readdir(config.paths.outputDir);
    const svgFiles = files
      .filter(
        (f) => f.toLowerCase().endsWith(".svg") && !f.startsWith("stitched_"),
      )
      .sort();

    if (svgFiles.length === 0) {
      return res.status(404).json({
        error: "No SVG files found to stitch",
        directory: config.paths.outputDir,
        hint: "You may need to run POST /images/generate first",
      });
    }

    // Extract year from files and create a stitched image based on the year of the activities
    const years = svgFiles.map((f) => {
      const match = f.match(/(\d{4})/);
      return match ? match[1] : null;
    });

    const uniqueYears = [...new Set(years)].filter((y) => y !== null);
    console.log(`Found SVG files from years: ${uniqueYears.join(", ")}`);

    if (uniqueYears.length === 0) {
      return res.status(400).json({
        error: "No valid year found in SVG filenames",
        hint: "SVG filenames should contain a 4-digit year (e.g., 2025)",
      });
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
            const filePath = path.join(config.paths.outputDir, file);
            const content = await fs.readFile(filePath, "utf-8");
            return { filename: file, content };
          }),
        );

        // Stitch images for this year
        const stitchedFilename = `stitched_${year}.svg`;
        const stitchedPath = path.join(
          config.paths.outputDir,
          stitchedFilename,
        );
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
          `[POST /images/stitch] Error stitching year ${year}:`,
          error,
        );
        results.push({
          year,
          error: error.message,
          success: false,
        });
      }
    }

    // Send consolidated response
    const successful = results.filter((r) => !r.error).length;
    const failed = results.filter((r) => r.error).length;

    res.json({
      message: "Stitch operation complete",
      summary: {
        totalYears: uniqueYears.length,
        successful,
        failed,
      },
      results,
    });
  } catch (error) {
    console.error("[POST /images/stitch] Error:", error);
    res.status(500).json({
      error: "Failed to stitch images",
      message: error.message,
    });
  }
});

async function stitchSVGs(svgContents, outputPath, year) {
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
  await fs.writeFile(outputPath, combinedSvg, "utf-8");

  // Convert to PNG
  const pngPath = outputPath.replace(".svg", ".png");
  await sharp(Buffer.from(combinedSvg)).png().toFile(pngPath);

  console.log(`  PNG version created: ${path.basename(pngPath)}`);

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
    svgFile: path.basename(outputPath),
    pngFile: path.basename(pngPath),
    success: true,
  };
}

/**
 * POST /images/generate-from-strava
 * Generate images from Strava activities via API
 */
app.post("/images/generate-from-strava", async (req, res) => {
  try {
    console.log(
      "[POST /images/generate-from-strava] Starting generation from Strava API",
    );

    // Fetch activities from Strava
    const activities = await client.getAllActivities({
      after: req.body.after || null,
      before: req.body.before || null,
      pageSize: req.body.pageSize || 100,
    });

    if (activities.length === 0) {
      return res.status(404).json({
        error: "No activities found",
        hint: "Check your date range or token permissions",
      });
    }

    console.log(`Found ${activities.length} Strava activities`);

    // Convert activities to tracks
    const tracks = activitiesToTracks(activities);
    const validTracks = tracks.filter((t) => t !== null);

    console.log(`Converted ${validTracks.length} activities to tracks`);

    if (validTracks.length === 0) {
      return res.status(404).json({
        error: "No valid tracks found",
        hint: "Activities may not have GPS data (polylines)",
      });
    }

    // Create temporary in-memory "files" for processFileActivities
    const trackFiles = validTracks.map((track, index) => {
      const date = new Date(track.date).toISOString().split("T")[0];
      const sanitizedName = track.name.replace(/[^a-zA-Z0-9]/g, "_");
      return {
        path: `strava_${date}_${sanitizedName}`,
        track: track,
        activity: {
          name: track.name,
          type: "Running", // Strava activities don't have exact type in polyline data
          time: track.date,
          coordinates: track.polylines[0].map((point) => [
            point.lng,
            point.lat,
          ]),
          distance: parseFloat(track.distance),
        },
      };
    });

    // Use processFileActivities-like logic with same config
    const options = {
      filterType: req.body.filterType || config.filter.type,
      width: config.draw.width,
      height: config.draw.height,
      colors: config.draw.colors,
      strokeWidth: config.draw.strokeWidth,
      aspectRatio: config.draw.aspectRatio,
      offsetX: config.draw.offsetX,
      offsetY: config.draw.offsetY,
      verbose: false,
    };

    const results = [];

    for (const trackFile of trackFiles) {
      try {
        // Random color selection (same as processFileActivities)
        const randomValue = Math.random();
        let selectedColor;
        if (randomValue < 0.33) {
          selectedColor = options.colors.track;
        } else if (randomValue < 0.66) {
          selectedColor = options.colors.trackAlt || options.colors.track;
        } else {
          selectedColor = options.colors.trackAlt2 || options.colors.track;
        }

        const drawOptions = {
          title: `${trackFile.activity.distance.toFixed(2)} mi`,
          width: options.width,
          height: options.height,
          colors: { track: selectedColor },
          strokeWidth: options.strokeWidth,
          aspectRatio: options.aspectRatio,
          offsetX: options.offsetX,
          offsetY: options.offsetY,
        };

        const svgContent = tracksToSVG([trackFile.track], drawOptions);

        const filename = `${trackFile.path}.svg`;
        const outputPath = path.join(config.paths.outputDir, filename);

        await fs.writeFile(outputPath, svgContent, "utf-8");

        results.push({
          activity: trackFile.activity.name,
          date: trackFile.activity.time,
          distance: trackFile.activity.distance.toFixed(2),
          outputImage: filename,
          success: true,
        });
      } catch (error) {
        results.push({
          activity: trackFile.activity.name,
          error: error.message,
          success: false,
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(
      `[POST /images/generate-from-strava] Complete: ${successful} successful, ${failed} failed`,
    );

    res.json({
      message: "Strava image generation complete",
      summary: {
        total: results.length,
        successful,
        failed,
      },
      results,
    });
  } catch (error) {
    console.error("[POST /images/generate-from-strava] Error:", error);
    res.status(500).json({
      error: "Failed to generate images from Strava",
      message: error.message,
    });
  }
});

/**
 * POST /images/generate
 * Generate all images from GPX/TCX files in the configured directory
 */
app.post("/images/generate", async (req, res) => {
  try {
    console.log(
      `[POST /images/generate] Starting generation from ${config.paths.sourceDir} with filter type "${config.filter.type}"`,
    );

    // Check if directory exists
    try {
      await fs.access(config.paths.sourceDir);
    } catch (error) {
      return res.status(400).json({
        error: "Source directory not found",
        path: config.paths.sourceDir,
      });
    }

    // Read all .gpx files in the directory
    const files = await fs.readdir(config.paths.sourceDir);
    const gpxFiles = files
      .filter(
        (f) =>
          f.toLowerCase().endsWith(".gpx") || f.toLowerCase().endsWith(".tcx"),
      )
      .sort()
      .map((f) => path.join(config.paths.sourceDir, f));

    if (gpxFiles.length === 0) {
      return res.status(404).json({
        error: "No GPX/TCX files found",
        directory: config.paths.sourceDir,
      });
    }

    console.log(`Found ${gpxFiles.length} GPX/TCX file(s)`);
    // Process activities
    const options = {
      filterType: config.filter.type,
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

    // Calculate summary
    const successful = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "error").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const skippedTypes = results
      .filter((r) => r.status === "skipped")
      .map((r) => r.type);
    console.log(`[POST /images/generate] Complete. Summary:`);
    console.log(`  ${successful} successful`);
    console.log(`  ${failed} failed`);
    console.log(`  ${skipped} skipped`);
    console.log(
      `  Skipped activity types: ${[...new Set(skippedTypes)].join(", ")}`,
    );

    res.json({
      message: "Image generation complete",
      summary: {
        total: results.length,
        successful,
        failed,
      },
      results: results.map((r) => ({
        gpxFile: path.basename(r.gpxFile),
        success: r.success,
        outputImage: r.outputImage ? path.basename(r.outputImage) : null,
        error: r.error || null,
      })),
    });
  } catch (error) {
    console.error("[POST /images/generate] Error:", error);
    res.status(500).json({
      error: "Failed to generate images",
      message: error.message,
    });
  }
});

/**
 * GET /images/:filename
 * Get the SVG image by its generated filename
 * Example: /images/2025-11-28_Cook_County_Run_473613929614966789.svg
 */
app.get("/images/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    // console.log(`[GET /images/${filename}] Requested`);

    // Validate filename
    if (
      !filename.toLowerCase().endsWith(".svg") &&
      !filename.toLowerCase().endsWith(".SVG") &&
      !filename.toLowerCase().endsWith(".png") &&
      !filename.toLowerCase().endsWith(".PNG")
    ) {
      return res.status(400).json({
        error: "Invalid filename",
        message: "Filename must end with .svg or .png",
      });
    }

    // Check if SVG or PNG file exists in output directory
    const filePath = path.join(config.paths.outputDir, filename);
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        error: "File not found",
        filename,
        path: filePath,
        hint: "You may need to run POST /images/generate first",
      });
    }

    // PNG files are served directly as binary
    if (filename.toLowerCase().endsWith(".png")) {
      // Serve PNG file
      const pngBuffer = await fs.readFile(filePath);
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      res.send(pngBuffer);

      console.log(`[GET /images/${filename}] Success (PNG)`);
      return;
    }

    // Read and return the SVG file
    const svgString = await fs.readFile(filePath, "utf-8");

    // Set response headers for SVG
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.send(svgString);

    console.log(`[GET /images/${filename}] Success`);
  } catch (error) {
    console.error(`[GET /images/${req.params.filename}] Error:`, error);

    res.status(500).json({
      error: "Failed to retrieve image",
      message: error.message,
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    config: {
      sourceDir: config.paths.sourceDir,
      outputDir: config.paths.outputDir,
      filterType: config.filter.type,
    },
  });
});

/**
 * GET /strava/activities
 */
app.get("/strava/activities", async (req, res) => {
  try {
    const activities = await client.getAllActivities({
      after: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60, // last 30 days
      before: null, // no upper limit
      pageSize: 10, // limit to 10 activities for demo
    });
    res.json({ message: "Activities fetched successfully", activities });
  } catch (error) {
    console.error("[GET /strava/activities] Error:", error);
    res.status(500).json({
      error: "Failed to fetch activities",
      message: error.message,
    });
  }
});

/**
 * GET /
 * Root endpoint with API documentation
 */
app.get("/", (req, res) => {
  res.json({
    message: "GPX/TCX > Map Silhouette API",
    version: "1.0.0",
    endpoints: {
      "POST /images/generate":
        "Generate all images from GPX/TCX files in the configured directory",
      "GET /images/:filename":
        "Get SVG image by generated filename (e.g., /images/2025-11-28_Activity_Name_123.svg)",
      "GET /health": "Health check and configuration status",
      "GET /demo.html": "Interactive demo page",
    },
    config: {
      sourceDir: config.paths.sourceDir,
      outputDir: config.paths.outputDir,
      filterType: config.filter.type,
      draw: config.draw,
    },
  });
});

// Start server
app.listen(config.server.port, () => {
  console.log(`\n🚀 Server running on http://localhost:${config.server.port}`);
  console.log(
    `   GET  http://localhost:${config.server.port}/images - List all images`,
  );
  console.log(
    `   GET  http://localhost:${config.server.port}/images/<filename>.svg - Get specific image`,
  );
  console.log(
    `   GET  http://localhost:${config.server.port}/health - Health check`,
  );
  console.log(
    `   POST http://localhost:${config.server.port}/images/generate - Generate all images`,
  );
  console.log(
    `   POST  http://localhost:${config.server.port}/images/stitch - Stitch all images into one (not implemented yet)`,
  );
});

module.exports = app;
