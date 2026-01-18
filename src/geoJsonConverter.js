/**
 * Convert coordinates to GeoJSON format suitable for Mapbox
 * @param {Array<Array<number>>} coordinates - Array of [lon, lat] pairs
 * @param {Object} properties - Additional properties for the feature
 * @returns {Object} GeoJSON Feature object
 */
function coordinatesToGeoJSON(coordinates, properties = {}) {
  return {
    type: 'Feature',
    properties: properties,
    geometry: {
      type: 'LineString',
      coordinates: coordinates
    }
  };
}

/**
 * Convert activity data to GeoJSON
 * @param {Object} activity - Activity object with coordinates and metadata
 * @returns {Object} GeoJSON Feature object
 */
function activityToGeoJSON(activity) {
  return coordinatesToGeoJSON(activity.coordinates, {
    name: activity.name,
    type: activity.type,
    time: activity.time
  });
}

module.exports = { coordinatesToGeoJSON, activityToGeoJSON };
