/**
 * Distance category enums for race distances
 */
const DistanceCategory = {
  ZERO_TO_5K: "ZERO_TO_5K",
  FIVE_K_TO_10K: "FIVE_K_TO_10K",
  TEN_K_TO_HALF: "TEN_K_TO_HALF",
  HALF_TO_FULL: "HALF_TO_FULL",
  FULL_AND_ABOVE: "FULL_AND_ABOVE",
};

/**
 * Get distance category for a given distance in miles
 * @param {number} distanceMiles - Distance in miles
 * @returns {string} Distance category enum value
 */
function getDistanceCategory(distanceMiles) {
  if (distanceMiles >= 26.2) {
    return DistanceCategory.FULL_AND_ABOVE;
  } else if (distanceMiles >= 13.1) {
    return DistanceCategory.HALF_TO_FULL;
  } else if (distanceMiles >= 6.2) {
    return DistanceCategory.TEN_K_TO_HALF;
  } else if (distanceMiles >= 3.1) {
    return DistanceCategory.FIVE_K_TO_10K;
  }
  return DistanceCategory.ZERO_TO_5K;
}

module.exports = {
  DistanceCategory,
  getDistanceCategory,
};
