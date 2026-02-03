const { XMLParser } = require("fast-xml-parser");

/**
 * Parse GPX XML content and extract coordinates
 * @param {string} gpxContent - GPX file content as string
 * @returns {Object} Parsed activity data with coordinates and metadata
 */
function parseGPX(gpxContent) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const gpxData = parser.parse(gpxContent);

  if (!gpxData.gpx) {
    throw new Error("Invalid GPX format");
  }

  const trk = gpxData.gpx.trk;
  if (!trk) {
    throw new Error("No track data found in GPX");
  }

  // Extract track segments
  const trkseg = Array.isArray(trk) ? trk[0].trkseg : trk.trkseg;
  const segments = Array.isArray(trkseg) ? trkseg : [trkseg];

  // Extract coordinates from all segments
  const coordinates = [];
  for (const segment of segments) {
    if (!segment.trkpt) continue;

    const points = Array.isArray(segment.trkpt)
      ? segment.trkpt
      : [segment.trkpt];
    for (const point of points) {
      if (point["@_lat"] && point["@_lon"]) {
        coordinates.push([
          parseFloat(point["@_lon"]),
          parseFloat(point["@_lat"]),
        ]);
      }
    }
  }

  // Extract activity type and metadata
  const metadata = gpxData.gpx.metadata || {};
  const activityType = trk.type || metadata.type || "Unknown";
  const name = trk.name || metadata.name || "Untitled";
  const time = trk.time || metadata.time || null;

  // Calculate total distance in miles
  // Using Haversine formula
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

  // Calculate total time in seconds (if possible)
  let totalTime = null;
  let pace = null;
  // Try to extract time from trkpt
  let times = [];
  for (const segment of segments) {
    if (!segment.trkpt) continue;
    const points = Array.isArray(segment.trkpt)
      ? segment.trkpt
      : [segment.trkpt];
    for (const point of points) {
      if (point.time) {
        times.push(new Date(point.time).getTime());
      }
    }
  }
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

module.exports = { parseGPX };
