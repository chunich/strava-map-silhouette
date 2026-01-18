# Usage Examples

This document provides detailed examples of how to use the strava-map-silhouette application.

## Prerequisites

Before running these examples, make sure you have:
1. Installed dependencies: `npm install`
2. Obtained a Mapbox access token from [mapbox.com](https://account.mapbox.com/access-tokens/)

## Example 1: Process a Single GPX File

Process the included example run activity:

```bash
MAPBOX_ACCESS_TOKEN=pk.your_actual_token_here node index.js examples/run_example.gpx
```

Expected output:
```
Processing 1 GPX file(s)...
Processing: examples/run_example.gpx
  Activity: Morning Run (Run)
  Coordinates: 11 points
  ✓ Saved silhouette: ./output/run_example_silhouette.png

=== Summary ===
Successful: 1
Failed: 0
Total: 1
```

## Example 2: Process Multiple Files

Process all GPX files in the examples directory:

```bash
MAPBOX_ACCESS_TOKEN=pk.your_actual_token_here node index.js examples/*.gpx
```

Expected output:
```
Processing 2 GPX file(s)...
Processing: examples/run_example.gpx
  Activity: Morning Run (Run)
  Coordinates: 11 points
  ✓ Saved silhouette: ./output/run_example_silhouette.png
Processing: examples/ride_example.gpx
  Skipping: Activity type is "Ride", not "Run"

=== Summary ===
Successful: 1
Failed: 0
Total: 2
```

Note: The ride activity is skipped because the default filter only processes "Run" activities.

## Example 3: Using npm Script

You can also use the npm start script:

```bash
MAPBOX_ACCESS_TOKEN=pk.your_actual_token_here npm start examples/run_example.gpx
```

## Example 4: Process Your Own GPX Files

To process your own Strava GPX files:

1. Export your activities from Strava as GPX files
2. Place them in a directory (e.g., `my-activities/`)
3. Run the processor:

```bash
MAPBOX_ACCESS_TOKEN=pk.your_actual_token_here node index.js my-activities/*.gpx
```

## Example 5: Environment Variable Setup

For convenience, you can set the Mapbox token as a persistent environment variable:

**On Linux/Mac:**
```bash
export MAPBOX_ACCESS_TOKEN=pk.your_actual_token_here
node index.js examples/run_example.gpx
```

**On Windows (Command Prompt):**
```cmd
set MAPBOX_ACCESS_TOKEN=pk.your_actual_token_here
node index.js examples/run_example.gpx
```

**On Windows (PowerShell):**
```powershell
$env:MAPBOX_ACCESS_TOKEN="pk.your_actual_token_here"
node index.js examples/run_example.gpx
```

## Understanding the Output

The application generates PNG images in the `./output` directory with the following characteristics:

- **Dimensions**: 500x500 pixels
- **Format**: PNG
- **Content**: Route path overlay showing the shape of your activity
- **Naming**: `<original_filename>_silhouette.png`

## Customization

To customize the behavior, you can modify the options in `index.js`:

### Change Activity Filter

To process different activity types, modify the `filterType` option:

```javascript
const results = await processGPXActivities(gpxFiles, outputDir, mapboxToken, {
  filterType: 'Ride', // Change to 'Ride', 'Walk', etc.
  imageWidth: 500,
  imageHeight: 500
});
```

### Change Image Dimensions

To generate different sized images:

```javascript
const results = await processGPXActivities(gpxFiles, outputDir, mapboxToken, {
  filterType: 'Run',
  imageWidth: 1000,  // Larger images
  imageHeight: 1000
});
```

### Change Route Appearance

To modify the route color or width, edit `src/mapboxClient.js`:

```javascript
async generateSilhouette(geoJSON, options = {}) {
  const { width = 500, height = 500, stroke = '#ff0000', strokeWidth = 5 } = options;
  // Red (#ff0000) route with thicker line (5px)
  // ...
}
```

## Troubleshooting

### Issue: "MAPBOX_ACCESS_TOKEN environment variable is required"
**Solution**: Make sure you've set the environment variable before running the command.

### Issue: "No track data found in GPX"
**Solution**: Ensure your GPX file contains `<trk>` and `<trkpt>` elements with latitude and longitude data.

### Issue: "Failed to download static image"
**Solution**: Check that:
- Your Mapbox token is valid and active
- You have not exceeded Mapbox API rate limits
- Your internet connection is working

### Issue: Output directory permission denied
**Solution**: Ensure you have write permissions in the current directory where the `output` folder will be created.

## API Integration Notes

This application uses the Mapbox Static Images API with the following features:

- **Polyline Encoding**: Routes are encoded using polyline encoding for efficient URL generation
- **Auto-fitting**: Routes are automatically fitted to the image dimensions
- **Style**: Uses Mapbox's `light-v11` style for minimal background
- **Rate Limits**: Be aware of Mapbox's API rate limits when processing many files

For more details on the Mapbox Static Images API, see: https://docs.mapbox.com/api/maps/static-images/
