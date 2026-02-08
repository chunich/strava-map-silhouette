const fs = require("fs").promises;
const path = require("path");
const { parseGPX } = require("./gpxParser");
const { parseTCX } = require("./tcxParser");
const { activityToGeoJSON } = require("./geoJsonConverter");
const { tracksToSVG, DEFAULT_DRAW_OPTIONS } = require("./tracksDrawer");

/**
 * Process activity files (GPX/TCX) and generate silhouette images
 * @param {Array<string>} gpxFilePaths - Array of GPX/TCX file paths
 * @param {string} outputDir - Output directory for silhouette images
 * @param {Object} options - Processing options
 */
async function processFileActivities(gpxFilePaths, outputDir, options = {}) {
  const { filterType = "Running", verbose = false } = options;

  await fs.mkdir(outputDir, { recursive: true });

  const results = [];

  for (const gpxFilePath of gpxFilePaths) {
    try {
      const logLine = `Processing [${gpxFilePaths.indexOf(gpxFilePath) + 1} of ${gpxFilePaths.length}]`;
      if (verbose) {
        console.log(logLine);
      } else {
        process.stdout.write(`${logLine}... `);
      }

      // Read file and detect format
      const fileContent = await fs.readFile(gpxFilePath, "utf-8");
      const fileExt = path.extname(gpxFilePath).toLowerCase();

      // Parse based on file extension
      const activity =
        fileExt === ".tcx" ? parseTCX(fileContent) : parseGPX(fileContent);

      // Filter by activity type (case insensitive)
      if (activity.type.toLowerCase() !== options.filterType?.toLowerCase()) {
        console.log(
          `  Skipping: Activity type is "${activity.type}", not "${options.filterType}"`,
        );
        continue;
      }

      // Log VERBOSE activity info
      if (verbose) {
        console.log(`  ✓ Parsed file: ${gpxFilePath}`);
        console.log(`  File:        ${path.basename(gpxFilePath)}`);
        console.log(`  Activity:    ${activity.name} (${activity.type})`);
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
          special: false,
        },
      ];

      // Save image
      const baseName = path.basename(gpxFilePath, path.extname(gpxFilePath));
      const dateStr = activity.time
        ? new Date(activity.time).toISOString().slice(0, 10)
        : "unknown_date";
      const activityName = activity.name.replace(/\s+/g, "_");
      const outputPath = path.join(
        outputDir,
        `${dateStr}_${activityName}_${baseName}_${fileExt}.svg`,
      );

      // Combine activity name, date, and distance for title
      // Format dateStr as "mm/dd/yyyy"
      let formattedDate = dateStr;
      if (activity.time) {
        const dateObj = new Date(activity.time);
        formattedDate = dateObj.toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      }

      // OPTION 1: "mm/dd/yyyy · 3.21 mi"
      let titleLabel = `${formattedDate} · ${
        activity?.distance ? `${activity.distance.toFixed(2)} mi` : ""
      }`;
      // OPTION 2: "26.2 mi"
      titleLabel = `${activity.distance.toFixed(2)}`;

      // Randomly select track color for variety
      const trackColorRoll = Math.random();
      const randomColors = {
        ...options.colors,
        track:
          trackColorRoll < 0.33
            ? options.colors.track
            : trackColorRoll < 0.66
              ? options.colors.trackAlt
              : options.colors.trackAlt2,
      };

      // Set dynamic colors based on distance thresholds
      if (activity.distance >= 26.2) {
        // Marathon or longer
        randomColors.track = options.colors.trackMarathon;
      } else if (activity.distance >= 13.1) {
        // Half marathon or longer
        randomColors.track = options.colors.trackHalfMarathon;
      } else if (activity.distance >= 6.2) {
        // 10K or longer
        randomColors.track = options.colors.track10K;
      } else if (activity.distance >= 3.1) {
        // 5K or longer
        randomColors.track = options.colors.track5K;
      }

      // With draw options from configuration
      const svgString = tracksToSVG(tracks, {
        ...DEFAULT_DRAW_OPTIONS,
        ...options, // Merge in custom options from config
        colors: randomColors,
        title: titleLabel,
      });
      await fs.writeFile(outputPath, svgString);
      console.log(`  ✓ Saved to: ${outputPath}`);

      // Record success
      results.push({
        gpxFile: gpxFilePath,
        activity: activity.name,
        type: activity.type,
        outputImage: outputPath,
        success: true,
      });
    } catch (error) {
      console.error(`  ✗ Error processing ${gpxFilePath}:`, error.message);
      results.push({
        gpxFile: gpxFilePath,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

module.exports = { processFileActivities };
