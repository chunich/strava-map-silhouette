const { XMLParser } = require("fast-xml-parser");

/**
 * Parse TCX XML content and extract coordinates
 * @param {string} tcxContent - TCX file content as string
 * @returns {Object} Parsed activity data with coordinates and metadata
 */
function parseTCX(tcxContent) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const tcxData = parser.parse(tcxContent);

  if (!tcxData.TrainingCenterDatabase) {
    throw new Error("Invalid TCX format");
  }

  const activities = tcxData.TrainingCenterDatabase.Activities;
  if (!activities || !activities.Activity) {
    throw new Error("No activity data found in TCX");
  }

  const activity = Array.isArray(activities.Activity)
    ? activities.Activity[0]
    : activities.Activity;

  // Extract trackpoints from all laps
  const laps = Array.isArray(activity.Lap) ? activity.Lap : [activity.Lap];

  // Extract coordinates from all trackpoints
  const coordinates = [];
  const times = [];

  for (const lap of laps) {
    if (!lap.Track) continue;

    const tracks = Array.isArray(lap.Track) ? lap.Track : [lap.Track];
    for (const track of tracks) {
      if (!track.Trackpoint) continue;

      const points = Array.isArray(track.Trackpoint)
        ? track.Trackpoint
        : [track.Trackpoint];

      for (const point of points) {
        if (point.Position) {
          const lat = parseFloat(point.Position.LatitudeDegrees);
          const lon = parseFloat(point.Position.LongitudeDegrees);
          if (!isNaN(lat) && !isNaN(lon)) {
            coordinates.push([lon, lat]);
          }
        }
        if (point.Time) {
          times.push(new Date(point.Time).getTime());
        }
      }
    }
  }

  // Extract activity type and metadata
  const activityType = activity["@_Sport"] || "Unknown";
  const name = activity.Notes || activityType || "Untitled";
  const time = activity.Id || null;

  // Calculate total distance in miles using Haversine formula
  function haversineDistance([lon1, lat1], [lon2, lat2]) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c) / 1609.34; // Convert meters to miles
  }

  let distance = 0;
  for (let i = 1; i < coordinates.length; i++) {
    distance += haversineDistance(coordinates[i - 1], coordinates[i]);
  }

  // Calculate total time in seconds and pace
  let totalTime = null;
  let pace = null;
  if (times.length >= 2) {
    totalTime = (Math.max(...times) - Math.min(...times)) / 1000; // seconds
    if (distance > 0) {
      pace = totalTime / distance; // seconds per mile
    }
  }

  return {
    name,
    type: activityType,
    time,
    coordinates,
    distance, // in miles
    pace, // in seconds per mile, or null if not available
  };
}

module.exports = { parseTCX };
