# Server API Documentation

## Starting the Server

```bash
npm run server
```

The server will start on `http://localhost:3000` (or the port specified in the `PORT` environment variable).

## Configuration

You can configure the server using environment variables:

```bash
PORT=8080 SOURCE_DIR=./my-files npm run server
```

Available environment variables:

- `PORT` - Server port (default: 3000)
- `SOURCE_DIR` - Directory containing GPX files (default: ./source)
- `OUTPUT_DIR` - Directory for generated SVG files (default: ./output)
- `FILTER_TYPE` - Activity type filter (default: Running)
- `IMAGE_WIDTH` - Image width (default: 500)
- `IMAGE_HEIGHT` - Image height (default: 500)

## API Endpoints

### `GET /`

Returns API information and available endpoints.

**Example:**

```bash
curl http://localhost:3000/
```

### `GET /health`

Health check endpoint that returns server status and configuration.

**Example:**

```bash
curl http://localhost:3000/health
```

**Response:**

```json
{
  "status": "ok",
  "config": {
    "sourceDir": "./source",
    "outputDir": "./output",
    "filterType": "Running"
  }
}
```

### `POST /images/generate`

Generate SVG images for all GPX files in the configured directory.

**Example:**

```bash
curl -X POST http://localhost:3000/images/generate
```

**Response:**

```json
{
  "message": "Image generation complete",
  "summary": {
    "total": 6,
    "successful": 6,
    "failed": 0
  },
  "results": [
    {
      "gpxFile": "473613929614966789.gpx",
      "success": true,
      "outputImage": "2024-12-18_Morning_Run_473613929614966789.svg",
      "error": null
    }
  ]
}
```

### `GET /images/:filename`

Get the SVG image by its generated filename. The filename should be the generated SVG filename (e.g., `2025-11-28_Cook_County_Run_473613929614966789.svg`).

**Example:**

```bash
curl http://localhost:3000/images/2025-11-28_Cook_County_Run_473613929614966789.svg
```

This returns the SVG image directly with `Content-Type: image/svg+xml`.

You can also view it in a browser:

```
http://localhost:3000/images/2025-11-28_Cook_County_Run_473613929614966789.svg
```

**Error Responses:**

- `400` - Invalid filename (must end with .svg)
- `404` - SVG file not found (may need to generate first)
- `500` - Server error

## Examples

### Generate all images:

```bash
curl -X POST http://localhost:3000/images/generate
```

### Get a specific image:

```bash
curl http://localhost:3000/images/2025-11-28_Cook_County_Run_473613929614966789.svg > activity.svg
```

### View in browser:

Open `http://localhost:3000/images/2025-11-28_Cook_County_Run_473613929614966789.svg` in your browser to see the SVG.

### View demo page:

Open `http://localhost:3000/demo.html` in your browser for an interactive demo.

## Testing

You can use the included GPX/TCX files in the `./source` directory for testing:

```bash
# Start the server
npm run server

# In another terminal, test the endpoints
curl -X POST http://localhost:3000/images/generate

# Get the generated filename from the response, then:
curl http://localhost:3000/images/2025-11-28_Cook_County_Run_473613929614966789.svg > test.svg
```
