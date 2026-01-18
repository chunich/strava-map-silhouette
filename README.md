# strava-map-silhouette

Convert Strava GPX activities to route silhouette images using Mapbox.

## Overview

This application processes GPX activity files (from Strava or other sources) and generates silhouette images of the routes. It converts GPX coordinates to GeoJSON format and uses the Mapbox Static Images API to render the route as a 500x500 pixel image, focusing on the shape of the route rather than map details.

## Features

- Parse GPX files and extract coordinate data
- Convert coordinates to GeoJSON format (Mapbox-compatible)
- Filter activities by type (e.g., "Run", "Ride")
- Generate 500x500px silhouette images of routes using Mapbox API
- Batch process multiple GPX files
- Automatic route fitting and bounding box calculation

## Prerequisites

- Node.js (v14 or higher)
- Mapbox access token (get one free at [mapbox.com](https://account.mapbox.com/access-tokens/))

## Installation

```bash
npm install
```

## Usage

### Basic Usage

Set your Mapbox access token as an environment variable and provide GPX file paths:

```bash
MAPBOX_ACCESS_TOKEN=your_token_here node index.js examples/run_example.gpx
```

### Process Multiple Files

```bash
MAPBOX_ACCESS_TOKEN=your_token_here node index.js examples/*.gpx
```

### Using npm script

```bash
MAPBOX_ACCESS_TOKEN=your_token_here npm start examples/run_example.gpx
```

## How It Works

1. **GPX Parsing**: Reads GPX files and extracts track coordinates and metadata
2. **Type Filtering**: Filters activities by type (default: "Run")
3. **GeoJSON Conversion**: Converts coordinates to GeoJSON LineString format
4. **Route Generation**: Uses Mapbox Static Images API to generate route overlay
5. **Image Export**: Saves the route as a 500x500px PNG image

## Output

Generated images are saved in the `./output` directory with the naming pattern:
```
<original_filename>_silhouette.png
```

## Project Structure

```
strava-map-silhouette/
├── index.js                  # Main entry point and processing logic
├── src/
│   ├── gpxParser.js          # GPX file parser
│   ├── geoJsonConverter.js   # GeoJSON conversion utilities
│   └── mapboxClient.js       # Mapbox API integration
├── examples/
│   ├── run_example.gpx       # Example run activity
│   └── ride_example.gpx      # Example ride activity
└── output/                   # Generated silhouette images (created automatically)
```

## API Reference

### processGPXActivities(gpxFilePaths, outputDir, mapboxToken, options)

Main function to process GPX files and generate silhouettes.

**Parameters:**
- `gpxFilePaths` (Array<string>): Array of GPX file paths to process
- `outputDir` (string): Output directory for generated images
- `mapboxToken` (string): Mapbox access token
- `options` (Object): Processing options
  - `filterType` (string): Activity type to filter (default: "Run")
  - `imageWidth` (number): Output image width (default: 500)
  - `imageHeight` (number): Output image height (default: 500)

**Returns:** Promise<Array<Object>> - Array of processing results

## Configuration

The application can be customized by modifying the options in `index.js`:

- **filterType**: Change the activity type filter (e.g., "Run", "Ride", "Walk")
- **imageWidth/Height**: Adjust output image dimensions
- **strokeColor/Width**: Modify route appearance in `mapboxClient.js`

## Example GPX Files

Two example GPX files are included in the `examples/` directory:
- `run_example.gpx` - A run activity (will be processed)
- `ride_example.gpx` - A ride activity (will be skipped by default filter)

## Troubleshooting

### "MAPBOX_ACCESS_TOKEN environment variable is required"
Make sure you've set the environment variable before running the command.

### "No track data found in GPX"
Ensure your GPX file contains `<trk>` and `<trkpt>` elements with latitude/longitude data.

### Rate Limiting
Mapbox has rate limits on their API. If processing many files, consider adding delays between requests.

## License

ISC
