const { XMLParser } = require('fast-xml-parser');

/**
 * Parse GPX XML content and extract coordinates
 * @param {string} gpxContent - GPX file content as string
 * @returns {Object} Parsed activity data with coordinates and metadata
 */
function parseGPX(gpxContent) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });

  const gpxData = parser.parse(gpxContent);
  
  if (!gpxData.gpx) {
    throw new Error('Invalid GPX format');
  }

  const trk = gpxData.gpx.trk;
  if (!trk) {
    throw new Error('No track data found in GPX');
  }

  // Extract track segments
  const trkseg = Array.isArray(trk) ? trk[0].trkseg : trk.trkseg;
  const segments = Array.isArray(trkseg) ? trkseg : [trkseg];

  // Extract coordinates from all segments
  const coordinates = [];
  for (const segment of segments) {
    if (!segment.trkpt) continue;
    
    const points = Array.isArray(segment.trkpt) ? segment.trkpt : [segment.trkpt];
    for (const point of points) {
      if (point['@_lat'] && point['@_lon']) {
        coordinates.push([
          parseFloat(point['@_lon']),
          parseFloat(point['@_lat'])
        ]);
      }
    }
  }

  // Extract activity type and metadata
  const metadata = gpxData.gpx.metadata || {};
  const activityType = trk.type || metadata.type || 'Unknown';
  const name = trk.name || metadata.name || 'Untitled';
  const time = trk.time || metadata.time || null;

  return {
    name,
    type: activityType,
    time,
    coordinates
  };
}

module.exports = { parseGPX };
