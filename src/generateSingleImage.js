const fs = require("fs").promises;
const path = require("path");
const { parseGPX } = require("./gpxParser");
const { activityToGeoJSON } = require("./geoJsonConverter");
const { tracksToSVG, DEFAULT_DRAW_OPTIONS } = require("./tracksDrawer");

/**
 * Generate SVG image for a single GPX file
 * @param {string} gpxFilePath - Path to the GPX file
 * @param {Object} options - Generation options
 * @returns {Promise<string>} - SVG string
 */
async function generateSingleGPXImage(gpxFilePath, options = {}) {
  const { filterType = "Running" } = options;

  // Read GPX file
  const gpxContent = await fs.readFile(gpxFilePath, "utf-8");
  const activity = parseGPX(gpxContent);

  // Filter by activity type (case insensitive)
  if (filterType && activity.type.toLowerCase() !== filterType.toLowerCase()) {
    throw new Error(
      `Activity type "${activity.type}" does not match filter type "${filterType}"`,
    );
  }

  // Convert to GeoJSON using @tmcw/togeojson
  const geoJSON = activityToGeoJSON({ gpxContent });

  // Convert GeoJSON coordinates to gridDrawer format
  let polyline = [];
  if (geoJSON && geoJSON.features && geoJSON.features.length > 0) {
    const line = geoJSON.features.find(
      (f) => f.geometry && f.geometry.type === "LineString",
    );
    if (line) {
      polyline = line.geometry.coordinates.map(([lng, lat]) => ({
        lng,
        lat,
      }));
    }
  }

  const tracks = [
    {
      polylines: [polyline],
      special: false,
    },
  ];

  // Format title
  let formattedDate = "Unknown Date";
  if (activity.time) {
    const dateObj = new Date(activity.time);
    formattedDate = dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  const titleLabel = `${formattedDate} · ${
    activity?.distance ? `${activity.distance.toFixed(2)} mi` : ""
  }`;

  // Generate SVG
  const svgString = tracksToSVG(tracks, {
    ...DEFAULT_DRAW_OPTIONS,
    title: titleLabel,
  });

  return svgString;
}

module.exports = { generateSingleGPXImage };
