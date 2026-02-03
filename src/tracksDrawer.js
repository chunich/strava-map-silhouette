// tracksDrawer.js
//
// JavaScript translation of the Python grid_drawer.py for Node.js SVG output
// Source: https://github.com/davidmerrick/GpxTrackPoster/blob/master/src/grid_drawer.py
//
// Portions of this code are adapted from GpxTrackPoster (MIT License):
//   Copyright (c) 2016-2017 Florian Pigorsch & Contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// Equirectangular projection instead of Mercator projection from original version
function latlng2xy(lat, lng) {
  return [lng, -lat]; // Equirectangular projection, flip Y axis for SVG
}

// Compute bounds for a set of lines (projected points)
function computeBoundsXY(lines) {
  let min_x = Infinity,
    max_x = -Infinity,
    min_y = Infinity,
    max_y = -Infinity;
  for (const line of lines) {
    for (const [x, y] of line) {
      min_x = Math.min(min_x, x);
      max_x = Math.max(max_x, x);
      min_y = Math.min(min_y, y);
      max_y = Math.max(max_y, y);
    }
  }
  return [min_x, min_y, max_x, max_y];
}

// Compute grid size (cell size, cols, rows)
function computeGrid(n, w, h) {
  // Try to make the grid as square as possible
  let bestSize = 0,
    bestCols = 1,
    bestRows = n;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cellW = w / cols;
    const cellH = h / rows;
    const size = Math.min(cellW, cellH);
    if (size > bestSize) {
      bestSize = size;
      bestCols = cols;
      bestRows = rows;
    }
  }
  return [bestSize, [bestCols, bestRows]];
}

const DEFAULT_DRAW_OPTIONS = {
  title: "",
  width: 500,
  height: 500,
  offsetX: 0,
  offsetY: 0,
  colors: { track: "#2ab6e8", special: "#e22" },
  strokeWidth: 5,
  aspectRatio: 1.2, // Y axis multiplier
};

// Defensive: ensure drawOptions always has required properties
function normalizeDrawOptions(drawOptions = {}) {
  return {
    ...DEFAULT_DRAW_OPTIONS,
    ...drawOptions,
    colors: {
      ...DEFAULT_DRAW_OPTIONS.colors,
      ...(drawOptions.colors || {}),
    },
  };
}

/**
 * Main function: given tracks, makes SVG output string
 * Each track: { polylines: [[{lat, lng}, ...], ...], special: bool }
 */
function tracksToSVG(tracks, drawOptions = DEFAULT_DRAW_OPTIONS) {
  const opts = normalizeDrawOptions(drawOptions);
  const { width, height, offsetX, offsetY, colors, strokeWidth, aspectRatio } =
    opts;

  // Compute grid: each cell is square, grid fills as much as possible
  const [cellSize, [countX, countY]] = computeGrid(
    tracks.length,
    width,
    height,
  );
  const spacingX = countX <= 1 ? 0 : (width - cellSize * countX) / (countX - 1);
  const spacingY =
    countY <= 1 ? 0 : (height - cellSize * countY) / (countY - 1);
  const gridOffsetX =
    offsetX + (width - countX * cellSize - (countX - 1) * spacingX) / 2;
  const gridOffsetY =
    offsetY + (height - countY * cellSize - (countY - 1) * spacingY) / 2;

  // Assemble SVG header
  let svgParts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    `<style>
      text { font-family: Arial, sans-serif; }
    </style>`,
  ];

  // Draw each track
  tracks.forEach((track, index) => {
    const x = index % countX;
    const y = Math.floor(index / countX);
    const color = track.special ? colors.special : colors.track;
    const tx = gridOffsetX + (0.05 + x) * cellSize + x * spacingX;
    const ty = gridOffsetY + (0.05 + y) * cellSize + y * spacingY;
    const w = 0.9 * cellSize,
      h = 0.9 * cellSize;

    // Project all points and collect lines
    let lines = [];
    for (const polyline of track.polylines) {
      lines.push(polyline.map(({ lat, lng }) => latlng2xy(lat, lng)));
    }

    // Get bounds
    let [min_x, min_y, max_x, max_y] = computeBoundsXY(lines);
    let d_x = max_x - min_x;
    let d_y = max_y - min_y;

    // Add minimum bounding box size and padding
    const MIN_SIZE = 1e-4; // Minimum spread to avoid degenerate scaling
    const PADDING = 0.05; // 5% padding on each side
    if (d_x < MIN_SIZE) {
      min_x -= MIN_SIZE / 2;
      max_x += MIN_SIZE / 2;
      d_x = max_x - min_x;
    }
    if (d_y < MIN_SIZE) {
      min_y -= MIN_SIZE / 2;
      max_y += MIN_SIZE / 2;
      d_y = max_y - min_y;
    }
    // Expand bounds by padding
    const pad_x = d_x * PADDING;
    const pad_y = d_y * PADDING;
    min_x -= pad_x;
    max_x += pad_x;
    min_y -= pad_y;
    max_y += pad_y;
    d_x = max_x - min_x;
    d_y = max_y - min_y;

    // Compute scale to fit bounds in w x h
    let scale = w / d_x;
    if (w / h > d_x / d_y) {
      scale = h / d_y;
    }

    // Centering offsets, account for aspectRatio in Y
    const drawOffsetX = tx + 0.5 * w - 0.5 * scale * d_x;
    const drawOffsetY = ty + 0.5 * h - 0.5 * scale * aspectRatio * d_y;

    // Generate <polyline> for each segment
    for (const line of lines) {
      const scaledPoints = line
        .map(([x0, y0]) =>
          [
            (drawOffsetX + scale * (x0 - min_x)).toFixed(2), // SVG X
            (drawOffsetY + scale * aspectRatio * (y0 - min_y)).toFixed(2), // SVG Y with aspect ratio
          ].join(","),
        )
        .join(" ");
      svgParts.push(
        `<polyline points="${scaledPoints}" stroke="${color}" fill="none" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>`,
      );
    }
  });

  // Draw title to lower right corner if provided with Arial font and size 16px
  if (drawOptions.title) {
    svgParts.push(
      `<text x="${width - 10}" y="${height - 10}" text-anchor="end" font-size="24" fill="#666">${drawOptions.title}</text>`,
    );
  }

  svgParts.push("</svg>");
  return svgParts.join("\n");
}

// -- Example usage --
// Define a track as: { polylines: [ [ {lat, lng}, ... ], ... ], special: true/false }
module.exports = { tracksToSVG };
