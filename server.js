const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { processGPXActivities } = require("./src/processGPXActivities");
const { generateSingleGPXImage } = require("./src/generateSingleImage");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (for demo.html and other assets)
app.use(express.static(__dirname));

// Configuration - can be overridden by environment variables
const config = {
  gpxDir: process.env.GPX_DIR || "./gpx",
  outputDir: process.env.OUTPUT_DIR || "./output",
  filterType: process.env.FILTER_TYPE || "Running",
  imageWidth: parseInt(process.env.IMAGE_WIDTH || "500"),
  imageHeight: parseInt(process.env.IMAGE_HEIGHT || "500"),
};

console.log("Server configuration:", config);

/**
 * POST /images/generate
 * Generate all images from GPX files in the configured directory
 */
app.post("/images/generate", async (req, res) => {
  try {
    console.log(
      `[POST /images/generate] Starting generation from ${config.gpxDir}`,
    );

    // Check if directory exists
    try {
      await fs.access(config.gpxDir);
    } catch (error) {
      return res.status(400).json({
        error: "GPX directory not found",
        path: config.gpxDir,
      });
    }

    // Read all .gpx files in the directory
    const files = await fs.readdir(config.gpxDir);
    const gpxFiles = files
      .filter((f) => f.toLowerCase().endsWith(".gpx"))
      .map((f) => path.join(config.gpxDir, f));

    if (gpxFiles.length === 0) {
      return res.status(404).json({
        error: "No GPX files found",
        directory: config.gpxDir,
      });
    }

    console.log(`Found ${gpxFiles.length} GPX file(s)`);

    // Process activities
    const options = {
      filterType: config.filterType,
      imageWidth: config.imageWidth,
      imageHeight: config.imageHeight,
      colors: { track: "#b7d05b", special: "#e22" },
      verbose: false,
    };

    const results = await processGPXActivities(
      gpxFiles,
      config.outputDir,
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
    const svgFilePath = path.join(config.outputDir, filename);
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
      gpxDir: config.gpxDir,
      outputDir: config.outputDir,
      filterType: config.filterType,
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
      gpxDir: config.gpxDir,
      outputDir: config.outputDir,
      filterType: config.filterType,
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(
    `   POST http://localhost:${PORT}/images/generate - Generate all images`,
  );
  console.log(
    `   GET  http://localhost:${PORT}/images/<filename>.svg - Get specific image`,
  );
  console.log(`   GET  http://localhost:${PORT}/health - Health check\n`);
});

module.exports = app;
