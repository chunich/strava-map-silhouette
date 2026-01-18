const fs = require('fs').promises;
const path = require('path');
const { parseGPX } = require('./src/gpxParser');
const { activityToGeoJSON } = require('./src/geoJsonConverter');
const { MapboxClient } = require('./src/mapboxClient');

/**
 * Process GPX files and generate silhouette images
 * @param {Array<string>} gpxFilePaths - Array of GPX file paths
 * @param {string} outputDir - Output directory for silhouette images
 * @param {string} mapboxToken - Mapbox access token
 * @param {Object} options - Processing options
 */
async function processGPXActivities(gpxFilePaths, outputDir, mapboxToken, options = {}) {
  const { filterType = 'Run', imageWidth = 500, imageHeight = 500 } = options;
  
  // Initialize Mapbox client
  const mapboxClient = new MapboxClient(mapboxToken);
  
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });
  
  const results = [];
  
  for (const gpxFilePath of gpxFilePaths) {
    try {
      console.log(`Processing: ${gpxFilePath}`);
      
      // Read GPX file
      const gpxContent = await fs.readFile(gpxFilePath, 'utf-8');
      
      // Parse GPX
      const activity = parseGPX(gpxContent);
      
      // Filter by activity type (case insensitive)
      if (filterType && activity.type.toLowerCase() !== filterType.toLowerCase()) {
        console.log(`  Skipping: Activity type is "${activity.type}", not "${filterType}"`);
        continue;
      }
      
      console.log(`  Activity: ${activity.name} (${activity.type})`);
      console.log(`  Coordinates: ${activity.coordinates.length} points`);
      
      // Convert to GeoJSON
      const geoJSON = activityToGeoJSON(activity);
      
      // Generate silhouette image
      const imageBuffer = await mapboxClient.generateSilhouette(geoJSON, {
        width: imageWidth,
        height: imageHeight
      });
      
      // Save image
      const baseName = path.basename(gpxFilePath, path.extname(gpxFilePath));
      const outputPath = path.join(outputDir, `${baseName}_silhouette.png`);
      await fs.writeFile(outputPath, imageBuffer);
      
      console.log(`  ✓ Saved silhouette: ${outputPath}`);
      
      results.push({
        gpxFile: gpxFilePath,
        activity: activity.name,
        type: activity.type,
        outputImage: outputPath,
        success: true
      });
      
    } catch (error) {
      console.error(`  ✗ Error processing ${gpxFilePath}:`, error.message);
      results.push({
        gpxFile: gpxFilePath,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Main entry point
 */
async function main() {
  // Check for required environment variable
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!mapboxToken) {
    console.error('Error: MAPBOX_ACCESS_TOKEN environment variable is required');
    console.error('Usage: MAPBOX_ACCESS_TOKEN=your_token_here node index.js <gpx_files...>');
    process.exit(1);
  }
  
  // Get GPX file paths from command line arguments
  const gpxFiles = process.argv.slice(2);
  
  if (gpxFiles.length === 0) {
    console.error('Error: No GPX files specified');
    console.error('Usage: MAPBOX_ACCESS_TOKEN=your_token_here node index.js <gpx_files...>');
    console.error('Example: MAPBOX_ACCESS_TOKEN=pk.xxx node index.js data/activity1.gpx data/activity2.gpx');
    process.exit(1);
  }
  
  console.log(`Processing ${gpxFiles.length} GPX file(s)...`);
  
  // Process activities
  const outputDir = './output';
  const results = await processGPXActivities(gpxFiles, outputDir, mapboxToken, {
    filterType: 'Run', // Only process Run activities
    imageWidth: 500,
    imageHeight: 500
  });
  
  // Print summary
  console.log('\n=== Summary ===');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${results.length}`);
}

// Run main function if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { processGPXActivities };
