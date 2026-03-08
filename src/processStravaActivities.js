const fs = require("fs").promises;
const path = require("path");
const { activitiesToTracks } = require("./stravaService");
const { tracksToSVG, DEFAULT_DRAW_OPTIONS } = require("./tracksDrawer");
const { getTrackColor } = require("./trackColors");

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
  return Number.isFinite(distanceMiles) ? distanceMiles : null;
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
          `Skipping: Activity type is "${activityType}", not "${filterType}"`,
        );
        results.push({
          activity: activity.name,
          type: activityType,
          date: activity.localDate || activity.date || null,
          distance: activity.distanceMiles || null,
          outputImage: null,
          status: "skipped",
          reason: `Activity type is \"${activityType}\", not \"${filterType}\"`,
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
          date: activity.localDate || activity.date || null,
          distance: distanceMiles.toFixed(2),
          outputImage: null,
          status: "skipped",
          reason: `Activity distance ${distanceMiles.toFixed(2)} mi is less than minimum ${minimumDistance} mi`,
        });
        continue;
      }

      if (!activity?.map?.polyline && !activity?.map?.summaryPolyline) {
        console.log("Skipping: Activity has no GPS polyline data");
        results.push({
          activity: activity.name,
          type: activityType,
          date: activity.localDate || activity.date || null,
          distance:
            distanceMiles != null
              ? distanceMiles.toFixed(2)
              : activity.distanceMiles,
          outputImage: null,
          status: "skipped",
          reason: "Activity has no GPS polyline data",
        });
        continue;
      }

      const [track] = activitiesToTracks([activity]);
      if (!track) {
        console.log("Skipping: Unable to decode polyline data");
        results.push({
          activity: activity.name,
          type: activityType,
          date: activity.localDate || activity.date || null,
          distance:
            distanceMiles != null
              ? distanceMiles.toFixed(2)
              : activity.distanceMiles,
          outputImage: null,
          status: "skipped",
          reason: "Unable to decode polyline data",
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

      // Set dynamic colors based on distance thresholds
      const trackColor = getTrackColor(distanceMiles, options);

      const titleLabel =
        distanceMiles != null ? `${distanceMiles.toFixed(2)} mi` : "";

      // With draw options from configuration
      const svgContent = tracksToSVG([track], {
        ...DEFAULT_DRAW_OPTIONS,
        ...options,
        colors: {
          ...(options.colors || {}),
          track: trackColor,
        },
        title: titleLabel,
      });

      await fs.writeFile(outputPath, svgContent, "utf-8");
      console.log(`✓ Saved to: ${outputPath}`);

      results.push({
        activity: activity.name,
        type: activityType,
        date: dateSource || null,
        distance:
          distanceMiles != null
            ? distanceMiles.toFixed(2)
            : activity.distanceMiles,
        outputImage: outputPath,
        status: "success",
      });
    } catch (error) {
      console.error(
        `✗ Error processing Strava activity \"${activity?.name || "unknown"}\":`,
        error.message,
      );
      results.push({
        activity: activity?.name || "unknown",
        type: getActivityType(activity || {}),
        date: activity?.localDate || activity?.date || null,
        status: "error",
        error: error.message,
      });
    }
  }

  return results;
}

module.exports = { processStravaActivities };
