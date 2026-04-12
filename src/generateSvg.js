const { tracksToSVG, DEFAULT_DRAW_OPTIONS } = require("./tracksDrawer");
const { getTrackColor } = require("./trackColors");

function formatDateLabel(dateSource) {
  if (!dateSource) {
    return "unknown_date";
  }

  const dateObj = new Date(dateSource);
  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getTitleLabel(option, titleDistanceMiles, titleDateLabel) {
  if (option === 1) {
    return `${titleDateLabel} · ${
      titleDistanceMiles != null ? `${titleDistanceMiles.toFixed(2)} mi` : ""
    }`;
  }

  if (option === 2) {
    return titleDistanceMiles != null
      ? `${titleDistanceMiles.toFixed(2)} mi`
      : "";
  }

  if (option === 3) {
    return titleDistanceMiles != null ? `${titleDistanceMiles.toFixed(2)}` : "";
  }

  return "";
}

function generateSvg({
  tracks,
  distanceMiles,
  dateSource,
  options = {},
  titleLabelOption = 3,
}) {
  const formattedDate = formatDateLabel(dateSource);
  const titleLabel =
    getTitleLabel(titleLabelOption, distanceMiles, formattedDate) || "";
  const trackColor = getTrackColor(distanceMiles, options);

  const svgContent = tracksToSVG(tracks, {
    ...DEFAULT_DRAW_OPTIONS,
    ...options,
    colors: {
      ...(options.colors || {}),
      track: trackColor,
    },
    title: titleLabel,
  });

  return { svgContent };
}

module.exports = { generateSvg };
