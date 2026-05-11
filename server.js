const express = require("express");
const config = require("./config");

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve static files (for demo.html and other assets)
app.use(express.static(__dirname));

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
      activityLookupDays: config.strava.activityLookupDays,
      draw: config.draw,
    },
  });
});

// Start server
const server = app.listen(config.server.port, () => {
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

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n❌ Port ${config.server.port} is already in use. Is another server running on that port?`,
    );
    console.error(
      `   Run: lsof -ti:${config.server.port} | xargs kill  to free the port.`,
    );
    process.exit(1);
  } else {
    throw err;
  }
});

module.exports = app;
