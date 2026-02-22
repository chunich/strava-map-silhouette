const { tcx } = require("@tmcw/togeojson");

require("dotenv").config();

/**
 * Centralized configuration for the application
 * Reads from environment variables with sensible defaults
 */

const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || "3000"),
  },

  // Directory paths
  paths: {
    sourceDir: process.env.SOURCE_DIR || "./source",
    outputDir: process.env.OUTPUT_DIR || "./output",
  },

  // Activity filter
  filter: {
    type: process.env.FILTER_TYPE || "Running",
  },

  // Draw options for SVG generation
  draw: {
    width: parseInt(process.env.IMAGE_SIZE || "500"),
    height: parseInt(process.env.IMAGE_SIZE || "500"),
    strokeWidth: parseFloat(process.env.STROKE_WIDTH || "5"),
    aspectRatio: parseFloat(process.env.ASPECT_RATIO || "1.2"),
    offsetX: parseFloat(process.env.OFFSET_X || "0"),
    offsetY: parseFloat(process.env.OFFSET_Y || "0"),
    colors: {
      trackMarathon: process.env.TRACK_COLOR_MARATHON || "#29e483",
      trackHalfMarathon: process.env.TRACK_COLOR_HALF_MARATHON || "#9c2abc",
      track10K: process.env.TRACK_COLOR_10K || "#3b55ff",
      track5K: process.env.TRACK_COLOR_5K || "#e8a631",
      trackDefault: process.env.TRACK_COLOR || "#ff61c2",
      //
      track: process.env.TRACK_COLOR || "#a2c231",
      trackAlt: process.env.TRACK_COLOR_ALT || "#b75bd0",
      trackAlt2: process.env.TRACK_COLOR_ALT2 || "#318923",
      special: process.env.SPECIAL_COLOR || "#e22",
    },
  },

  strava: {
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    accessToken: process.env.STRAVA_ACCESS_TOKEN,
    refreshToken: process.env.STRAVA_REFRESH_TOKEN,
  },
};

module.exports = config;
