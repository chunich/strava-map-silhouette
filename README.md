# strava-map-silhouette

Convert Strava GPX activities to route silhouette SVG images.

## Overview

This application processes GPX activity files (from Strava or other sources) and generates silhouette images of the routes. It converts GPX coordinates to GeoJSON format and renders the route as a 500x500 pixel SVG image, focusing on the shape of the route rather than map details.

## Features

- Parse GPX files and extract coordinate data
- Convert coordinates to GeoJSON format
- Filter activities by type (e.g., "Run", "Ride")
- Generate 500x500px silhouette images of routes as SVG
- Batch process multiple GPX files

## Demo

You can try the tool with the included example files:

- Run:
  ```bash
  node index.js ./gpx
  ```
- Ride:
  ```bash
  node index.js ./gpx --filterType=Ride
  ```

The output SVGs will appear in the `output/` directory.

## Prerequisites

- Node.js (v14 or higher)

## Installation

```bash
npm install
```

## Usage

### Basic Usage

Provide GPX file path:

```bash
node index.js examples/run_example.gpx
```

### With Debug ON

```bash
node index.js ./gpx --debug
```

### Using npm script with Debug ON

```bash
npm start -- ./gpx --debug
```

## How It Works

1. **GPX Parsing**: Reads GPX files and extracts track coordinates and metadata
2. **Type Filtering**: Filters activities by type (default: "Run")
3. **GeoJSON Conversion**: Converts coordinates to GeoJSON LineString format
4. **SVG Generation**: Renders the route as a silhouette SVG image
5. **Image Export**: Saves the route as a 500x500px SVG image

## Output

Generated images are saved in the `./output` directory with the naming pattern:

```
<date>_<activity_name>_<original_filename>.svg
```

## Project Structure

```
strava-map-silhouette/
├── index.js                  # Main entry point and processing logic
├── src/
│   ├── gpxParser.js          # GPX file parser
│   ├── geoJsonConverter.js   # GeoJSON conversion utilities
├── examples/
│   ├── run_example.gpx       # Example run activity
│   └── ride_example.gpx      # Example ride activity
└── output/                   # Generated silhouette images (created automatically)
```

## API Reference

### processGPXActivities(gpxFilePaths, outputDir, options)

Main function to process GPX files and generate silhouettes.

**Parameters:**

- `gpxFilePaths` (Array<string>): Array of GPX file paths to process
- `outputDir` (string): Output directory for generated images
- `options` (Object): Processing options
  - `filterType` (string): Activity type to filter (default: "Run")
  - `imageWidth` (number): Output image width (default: 500)
  - `imageHeight` (number): Output image height (default: 500)

**Returns:** Promise<Array<Object>> - Array of processing results

## Configuration

The application can be customized by modifying the options in `index.js`:

- **filterType**: Change the activity type filter (e.g., "Run", "Ride", "Walk")
- **imageWidth/Height**: Adjust output image dimensions
  // ...existing code...

## Example GPX Files

Two example GPX files are included in the `examples/` directory:

- `run_example.gpx` - A run activity (will be processed)
- `ride_example.gpx` - A ride activity (will be skipped by default filter)

## Troubleshooting

### "No track data found in GPX"

Ensure your GPX file contains `<trk>` and `<trkpt>` elements with latitude/longitude data.

## License

ISC
