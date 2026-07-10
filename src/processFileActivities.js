const fs = require("fs").promises;
const path = require("path");
const { parseGPX } = require("./gpxParser");
const { parseTCX } = require("./tcxParser");
const { activityToGeoJSON } = require("./geoJsonConverter");
const {
  DistanceCategory,
  getDistanceCategory,
} = require("./distanceCategories");
const { generateSvg } = require("./generateSvg");

function getActivityType(activity) {
  return activity.type || "Unknown";
}

/**
 * Process activity files (GPX/TCX) and generate silhouette images
 * @param {Array<string>} gpxPaths - Array of GPX/TCX file paths
 * @param {string} outputDir - Output directory for silhouette images
 * @param {Object} options - Processing options
 */
async function processFileActivities(gpxPaths, outputDir, options = {}) {
  const {
    filterType = "Running",
    minimumDistance = 1,
    verbose = false,
  } = options;

  await fs.mkdir(outputDir, { recursive: true });

  const results = [];

  for (const gpxPath of gpxPaths) {
    try {
      const logLine = `Processing [${gpxPaths.indexOf(gpxPath) + 1} of ${gpxPaths.length}]`;
      if (verbose) {
        console.log(logLine);
      } else {
        process.stdout.write(`${logLine}... `);
      }

      // Read file and detect format
      const fileContent = await fs.readFile(gpxPath, "utf-8");
      const fileExt = path.extname(gpxPath).toLowerCase();

      // Parse based on file extension
      const activity =
        fileExt === ".tcx" ? parseTCX(fileContent) : parseGPX(fileContent);
      const activityType = getActivityType(activity);

      // Filter by activity type (case insensitive)
      if (
        filterType &&
        activityType.toLowerCase() !== filterType?.toLowerCase()
      ) {
        console.log(
          `  Skipping: Activity type is "${activityType}", not "${filterType}"`,
        );
        // Record skipped activity
        results.push({
          activity: activity.name,
          type: activityType,
          status: "skipped",
          outputImage: "",
          gpxFile: "",
        });
        continue;
      }

      // Discard activities that are too short (e.g. less than 1 mile)
      if (activity.distance != null && activity.distance < minimumDistance) {
        console.log(
          `  Skipping: Activity distance ${activity.distance.toFixed(
            2,
          )} mi is less than minimum ${minimumDistance} mi`,
        );
        // Record skipped activity
        results.push({
          activity: activity.name,
          type: activityType,
          status: "skipped",
          outputImage: "",
          gpxFile: "",
        });
        continue;
      }

      // Log VERBOSE activity info
      if (verbose) {
        console.log(`  ✓ Parsed file: ${gpxPath}`);
        console.log(`  File:        ${path.basename(gpxPath)}`);
        console.log(`  Activity:    ${activity.name} (${activityType})`);
        console.log(`  Date:        ${activity.time}`);
        console.log(`  Coordinates: ${activity.coordinates.length} points`);
      }

      // Convert to polyline format
      let polyline = [];

      if (fileExt === ".tcx") {
        // TCX already has coordinates in the right format
        polyline = activity.coordinates.map(([lng, lat]) => ({ lng, lat }));
      } else {
        // GPX needs GeoJSON conversion
        const geoJSON = activityToGeoJSON({ gpxContent: fileContent });

        // Save debug GeoJSON file
        if (verbose) {
          await fs.writeFile(
            path.join(outputDir, "debug_geojson.json"),
            JSON.stringify(geoJSON, null, 2),
          );
        }

        // Use the first LineString found in the GeoJSON output
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
      }

      const tracks = [
        {
          polylines: [polyline],
          isRace: false,
        },
      ];

      // Save image
      const baseName = path.basename(gpxPath, path.extname(gpxPath));
      const dateStr = activity.time
        ? new Date(activity.time).toISOString().slice(0, 10)
        : "unknown_date";
      const activityName = activity.name.replace(/\s+/g, "_");
      const filename = `${dateStr}_${activityName}_${baseName}.svg`;
      const outputPath = path.join(outputDir, filename);
      const { svgContent, titleLabel } = generateSvg({
        tracks,
        distanceMiles: activity.distance,
        dateSource: activity.time,
        options,
        titleLabelOption: 3,
      });
      await fs.writeFile(outputPath, svgContent, "utf-8");
      const metadataPath = outputPath.replace(".svg", ".json");
      await fs.writeFile(
        metadataPath,
        JSON.stringify({ titleLabel }, null, 2),
        "utf-8",
      );
      console.log(`  ✓ Saved to: ${outputPath}`);

      // Record success
      results.push({
        activity: activity.name,
        type: activity.type,
        status: "success",
        gpxFile: gpxPath,
        distance:
          activity.distance != null ? activity.distance.toFixed(2) : null,
        outputImage: outputPath,
      });
    } catch (error) {
      console.error(`  ✗ Error processing \"${gpxPath}\":`, error.message);
      results.push({
        activity: activity?.name || "unknown",
        type: getActivityType(activity || {}),
        status: "error",
        error: error.message,
        gpxFile: gpxPath,
      });
    }
  }

  return results;
}

module.exports = { processFileActivities };
