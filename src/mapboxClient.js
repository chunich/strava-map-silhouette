const axios = require('axios');
const polyline = require('@mapbox/polyline');

/**
 * Mapbox client for generating route silhouettes
 */
class MapboxClient {
  constructor(accessToken) {
    if (!accessToken) {
      throw new Error('Mapbox access token is required');
    }
    this.accessToken = accessToken;
    this.baseUrl = 'https://api.mapbox.com';
  }

  /**
   * Calculate bounding box for coordinates
   * @param {Array<Array<number>>} coordinates - Array of [lon, lat] pairs
   * @returns {Array<number>} Bounding box [minLon, minLat, maxLon, maxLat]
   */
  calculateBoundingBox(coordinates) {
    let minLon = Infinity, minLat = Infinity;
    let maxLon = -Infinity, maxLat = -Infinity;

    for (const [lon, lat] of coordinates) {
      minLon = Math.min(minLon, lon);
      minLat = Math.min(minLat, lat);
      maxLon = Math.max(maxLon, lon);
      maxLat = Math.max(maxLat, lat);
    }

    return [minLon, minLat, maxLon, maxLat];
  }

  /**
   * Generate static image URL for a route
   * @param {Object} geoJSON - GeoJSON feature with LineString geometry
   * @param {Object} options - Image options (width, height, etc.)
   * @returns {string} Mapbox Static Images API URL
   */
  generateStaticImageUrl(geoJSON, options = {}) {
    const { width = 500, height = 500, stroke = '#ff0000', strokeWidth = 3 } = options;
    
    const coordinates = geoJSON.geometry.coordinates;
    
    // Encode path as polyline for more compact URL
    const encoded = polyline.encode(coordinates.map(c => [c[1], c[0]]));
    
    // Calculate bounding box to auto-fit the route
    const bbox = this.calculateBoundingBox(coordinates);
    
    // Create overlay path with encoded polyline
    const path = `path-${strokeWidth}+${stroke.replace('#', '')}(${encodeURIComponent(encoded)})`;
    
    // Use auto bounds based on overlay
    const url = `${this.baseUrl}/styles/v1/mapbox/light-v11/static/${path}/auto/${width}x${height}?access_token=${this.accessToken}`;
    
    return url;
  }

  /**
   * Download static image for a route
   * @param {Object} geoJSON - GeoJSON feature with LineString geometry
   * @param {Object} options - Image options (width, height, etc.)
   * @returns {Promise<Buffer>} Image data as buffer
   */
  async downloadStaticImage(geoJSON, options = {}) {
    const url = this.generateStaticImageUrl(geoJSON, options);
    
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer'
      });
      
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to download static image: ${error.message}`);
    }
  }

  /**
   * Generate silhouette image (simplified version without map details)
   * For true silhouette, we use a plain style with only the path overlay
   * @param {Object} geoJSON - GeoJSON feature with LineString geometry
   * @param {Object} options - Image options
   * @returns {Promise<Buffer>} Image data as buffer
   */
  async generateSilhouette(geoJSON, options = {}) {
    // Use white background style for silhouette effect
    const { width = 500, height = 500, stroke = '#000000', strokeWidth = 2 } = options;
    
    const coordinates = geoJSON.geometry.coordinates;
    const encoded = polyline.encode(coordinates.map(c => [c[1], c[0]]));
    
    // Use path overlay on a blank/minimal style
    const path = `path-${strokeWidth}+${stroke.replace('#', '')}(${encodeURIComponent(encoded)})`;
    
    // Using light-v11 style which is minimal for silhouette effect
    const url = `${this.baseUrl}/styles/v1/mapbox/light-v11/static/${path}/auto/${width}x${height}?access_token=${this.accessToken}`;
    
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer'
      });
      
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to generate silhouette: ${error.message}`);
    }
  }
}

module.exports = { MapboxClient };
