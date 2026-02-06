const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const config = require("./config");
const { processGPXActivities } = require("./src/processGPXActivities");
const { generateSingleGPXImage } = require("./src/generateSingleImage");

const app = express();

// Serve static files (for demo.html and other assets)
app.use(express.static(__dirname));

console.log("Server configuration:", config);

/** GET /images
 * List all generated SVG images in the output directory
 */
app.get("/images", async (req, res) => {
  try {
    console.log(`[GET /images] Requested`);

    // Check if output directory exists
    try {
      await fs.access(config.paths.outputDir);
    } catch (error) {
      return res.status(400).json({
        error: "Output directory not found",
        path: config.paths.outputDir,
      });
    }

    // Read all .svg files in the directory
    const files = await fs.readdir(config.paths.outputDir);
    const svgFiles = files.filter((f) => f.toLowerCase().endsWith(".svg"));

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
 * POST /images/generate
 * Generate all images from GPX files in the configured directory
 */
app.post("/images/generate", async (req, res) => {
  try {
    console.log(
      `[POST /images/generate] Starting generation from ${config.paths.gpxDir}`,
    );

    // Check if directory exists
    try {
      await fs.access(config.paths.gpxDir);
    } catch (error) {
      return res.status(400).json({
        error: "GPX directory not found",
        path: config.paths.gpxDir,
      });
    }

    // Read all .gpx files in the directory
    const files = await fs.readdir(config.paths.gpxDir);
    const gpxFiles = files
      .filter((f) => f.toLowerCase().endsWith(".gpx"))
      .map((f) => path.join(config.paths.gpxDir, f));

    if (gpxFiles.length === 0) {
      return res.status(404).json({
        error: "No GPX files found",
        directory: config.paths.gpxDir,
      });
    }

    console.log(`Found ${gpxFiles.length} GPX file(s)`);

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

    const results = await processGPXActivities(
      gpxFiles,
      config.paths.outputDir,
      options,
    );

    // Calculate summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(
      `[POST /images/generate] Complete: ${successful} successful, ${failed} failed`,
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
    console.log(`[GET /images/${filename}] Requested`);

    // Validate filename
    if (!filename.toLowerCase().endsWith(".svg")) {
      return res.status(400).json({
        error: "Invalid filename",
        message: "Filename must end with .svg",
      });
    }

    // Check if SVG file exists in output directory
    const svgFilePath = path.join(config.paths.outputDir, filename);
    try {
      await fs.access(svgFilePath);
    } catch (error) {
      return res.status(404).json({
        error: "SVG file not found",
        filename,
        path: svgFilePath,
        hint: "You may need to run POST /images/generate first",
      });
    }

    // Read and return the SVG file
    const svgString = await fs.readFile(svgFilePath, "utf-8");

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
      gpxDir: config.paths.gpxDir,
      outputDir: config.paths.outputDir,
      filterType: config.filter.type,
    },
  });
});

/**
 * GET /
 * Root endpoint with API documentation
 */
app.get("/", (req, res) => {
  res.json({
    message: "GPX > Map Silhouette API",
    version: "1.0.0",
    endpoints: {
      "POST /images/generate":
        "Generate all images from GPX files in the configured directory",
      "GET /images/:filename":
        "Get SVG image by generated filename (e.g., /images/2025-11-28_Activity_Name_123.svg)",
      "GET /health": "Health check and configuration status",
      "GET /demo.html": "Interactive demo page",
    },
    config: {
      gpxDir: config.paths.gpxDir,
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
});

module.exports = app;
