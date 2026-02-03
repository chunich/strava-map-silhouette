# Usage Examples

This document provides detailed examples of how to use the strava-map-silhouette application.

## Prerequisites

Before running these examples, make sure you have:

1. Installed dependencies: `npm install`

## Example 1: Process a Single GPX File

Process the included example run activity:

```bash
node index.js examples/run_example.gpx
```

Expected output:

```
Processing 1 GPX file(s)...
Processing: examples/run_example.gpx
  Activity: Morning Run (Run)
  Coordinates: 11 points
  ✓ Saved silhouette: ./output/run_example_silhouette.svg

=== Summary ===
Successful: 1
Failed: 0
Total: 1
```

## Example 2: Process Multiple Files

Process all GPX files in the examples directory:

```bash
node index.js examples/*.gpx
```

Expected output:

```
Processing 2 GPX file(s)...
Processing: examples/run_example.gpx
  Activity: Morning Run (Run)
  Coordinates: 11 points
  ✓ Saved silhouette: ./output/run_example_silhouette.svg
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
npm start examples/run_example.gpx
```

## Example 4: Process Your Own GPX Files

To process your own GPX files:

1. Export your activities from Garmin/COROS/Strava as GPX files
2. Place them in a directory (e.g., `my-activities/`)
3. Run the processor:

```bash
node index.js my-activities/*.gpx
```

## Understanding the Output

The application generates SVG images in the `./output` directory with the following characteristics:

- **Dimensions**: 500x500 pixels (default, configurable)
- **Format**: SVG
- **Content**: Route path overlay showing the shape of your activity
- **Naming**: `<original_filename>_silhouette.svg`

## Customization

To customize the behavior, you can modify the options in `index.js`:

### Change Activity Filter

To process different activity types, modify the `filterType` option:

```javascript
const results = await processGPXActivities(gpxFiles, outputDir, {
  filterType: "Ride", // Change to 'Ride', 'Walk', etc.
  imageWidth: 500,
  imageHeight: 500,
});
```

### Change Image Dimensions

To generate different sized images:

```javascript
const results = await processGPXActivities(gpxFiles, outputDir, {
  filterType: "Run",
  imageWidth: 1000, // Larger images
  imageHeight: 1000,
});
```

### Change Route Appearance

To modify the route color or width, edit the `tracksToSVG` options in `index.js`.

## Troubleshooting

### Issue: "No track data found in GPX"

**Solution**: Ensure your GPX file contains `<trk>` and `<trkpt>` elements with latitude and longitude data.

### Issue: Output directory permission denied

**Solution**: Ensure you have write permissions in the current directory where the `output` folder will be created.
