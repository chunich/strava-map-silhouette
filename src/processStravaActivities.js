const fs = require("fs").promises;
const path = require("path");
const { activitiesToTracks } = require("./stravaService");
const { generateSvg } = require("./generateSvg");

function sanitizeFilenamePart(value, fallback = "activity") {
  const sanitized = (value || "")
    .toString()
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return sanitized || fallback;
}

function getActivityType(activity) {
  return activity.sportType || activity.type || "Unknown";
}

function getActivityDistanceMiles(activity) {
  const distanceMiles = Number.parseFloat(activity.distanceMiles);
  if (Number.isFinite(distanceMiles)) {
    return distanceMiles;
  }

  const distanceMeters = Number.parseFloat(activity.distance);
  if (Number.isFinite(distanceMeters)) {
    return distanceMeters * 0.000621371;
  }

  return null;
}

/**
 * Process Strava activities and generate silhouette images
 * @param {Array<Object>} activities - Formatted Strava activities
 * @param {string} outputDir - Output directory for silhouette images
 * @param {Object} options - Processing options
 */
async function processStravaActivities(activities, outputDir, options = {}) {
  const { filterType = "Run", minimumDistance = 1, verbose = false } = options;

  await fs.mkdir(outputDir, { recursive: true });

  const results = [];
  const activityList = Array.isArray(activities) ? activities : [];

  for (const activity of activityList) {
    const activityIndex = activityList.indexOf(activity) + 1;
    const logLine = `Processing [${activityIndex} of ${activityList.length}]`;

    if (verbose) {
      console.log(logLine);
    } else {
      process.stdout.write(`${logLine}... `);
    }

    try {
      const activityType = getActivityType(activity);

      if (
        filterType &&
        activityType.toLowerCase() !== filterType.toLowerCase()
      ) {
        console.log(
          `  Skipping: Activity type is "${activityType}", not "${filterType}"`,
        );
        results.push({
          activity: activity.name,
          type: activityType,
          status: "skipped",
          reason: `Activity type is \"${activityType}\", not \"${filterType}\"`,
          date: activity.localDate || activity.date || null,
          distance: activity.distanceMiles || null,
          outputImage: null,
        });
        continue;
      }

      const distanceMiles = getActivityDistanceMiles(activity);
      if (distanceMiles != null && distanceMiles < minimumDistance) {
        console.log(
          `Skipping: Activity distance ${distanceMiles.toFixed(2)} mi is less than minimum ${minimumDistance} mi`,
        );
        results.push({
          activity: activity.name,
          type: activityType,
          status: "skipped",
          reason: `Activity distance ${distanceMiles.toFixed(2)} mi is less than minimum ${minimumDistance} mi`,
          date: activity.localDate || activity.date || null,
          distance: distanceMiles.toFixed(2),
          outputImage: null,
        });
        continue;
      }

      if (!activity?.map?.polyline && !activity?.map?.summaryPolyline) {
        console.log("Skipping: Activity has no GPS polyline data");
        results.push({
          activity: activity.name,
          type: activityType,
          status: "skipped",
          reason: "Activity has no GPS polyline data",
          date: activity.localDate || activity.date || null,
          distance:
            distanceMiles != null
              ? distanceMiles.toFixed(2)
              : activity.distanceMiles,
          outputImage: null,
        });
        continue;
      }

      const [track] = activitiesToTracks([activity]);
      if (!track) {
        console.log("Skipping: Unable to decode polyline data");
        results.push({
          activity: activity.name,
          type: activityType,
          status: "skipped",
          reason: "Unable to decode polyline data",
          date: activity.localDate || activity.date || null,
          distance:
            distanceMiles != null
              ? distanceMiles.toFixed(2)
              : activity.distanceMiles,
          outputImage: null,
        });
        continue;
      }

      // Save image
      const dateSource = track.date || activity.localDate || activity.date;
      const dateStr = dateSource
        ? new Date(dateSource).toISOString().slice(0, 10)
        : "unknown_date";
      const activityId = activity.id || activityIndex;
      const activityName = sanitizeFilenamePart(
        activity.name,
        "strava_activity",
      );
      const filename = `strava_${dateStr}_${activityName}_${activityId}.svg`;
      const outputPath = path.join(outputDir, filename);
      const { svgContent, titleLabel } = generateSvg({
        tracks: [track],
        distanceMiles,
        dateSource,
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

      results.push({
        activity: activity.name,
        type: activityType,
        status: "success",
        date: dateSource || null,
        distance: distanceMiles != null ? distanceMiles.toFixed(2) : null,
        outputImage: outputPath,
      });
    } catch (error) {
      console.error(
        `  ✗ Error processing \"${activity.name || "unknown"}\":`,
        error.message,
      );
      results.push({
        activity: activity?.name || "unknown",
        type: getActivityType(activity || {}),
        status: "error",
        error: error.message,
        date: activity?.localDate || activity?.date || null,
      });
    }
  }

  return results;
}

module.exports = { processStravaActivities };
