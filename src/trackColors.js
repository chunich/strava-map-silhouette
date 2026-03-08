const {
  DistanceCategory,
  getDistanceCategory,
} = require("./distanceCategories");

function getTrackColor(distance, options) {
  const category = getDistanceCategory(distance);
  switch (category) {
    case DistanceCategory.FULL_AND_ABOVE:
      return options.colors.trackMarathon;
    case DistanceCategory.HALF_TO_FULL:
      return options.colors.trackHalfMarathon;
    case DistanceCategory.TEN_K_TO_HALF:
      return options.colors.track10K;
    case DistanceCategory.FIVE_K_TO_10K:
      return options.colors.track5K;
    // ZERO_TO_5K uses the random color from above
    default:
      return options.colors.trackDefault;
  }
}

module.exports = {
  getTrackColor,
};
