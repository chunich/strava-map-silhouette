const togeojson = require("@tmcw/togeojson");
const { DOMParser } = require("xmldom");

/**
 * Convert activity data (with raw GPX XML) to GeoJSON using @tmcw/togeojson
 * @param {Object} activity - Activity object with gpxContent (string)
 * @returns {Object} GeoJSON FeatureCollection
 */
function activityToGeoJSON(activity) {
  if (!activity.gpxContent) {
    throw new Error("activity.gpxContent (raw GPX XML string) is required");
  }
  const dom = new DOMParser().parseFromString(activity.gpxContent);
  return togeojson.gpx(dom);
}

module.exports = { activityToGeoJSON };
