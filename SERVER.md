# API Runtime Documentation

## Starting the App

```bash
npm run dev
```

The Next.js app starts on `http://localhost:3000` by default.

## Configuration

Configure behavior through environment variables loaded by `config.js`.

Common variables:

- `PORT` - App port (default: 3000)
- `SOURCE_DIR` - Directory containing GPX/TCX/FIT files
- `OUTPUT_DIR` - Directory for generated SVG/PNG files
- `FILTER_TYPE` - Activity type filter
- `ACTIVITY_LOOKUP_DAYS` - Number of recent days fetched by `GET /api/strava/activities`
- `IMAGE_WIDTH` - Output image width
- `IMAGE_HEIGHT` - Output image height

## API Endpoints

- `GET /api/health`
- `GET /api/images`
- `GET /api/images/:filename`
- `POST /api/images/generate`
- `POST /api/images/generate-from-strava`
- `POST /api/images/stitch`
- `GET /api/strava/activities`

## Quick Checks

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/images
curl http://localhost:3000/api/strava/activities
```

## Legacy Note

The old Express `server.js` runtime has been retired. API requests should target `/api/...` routes.

## FIT Note

FIT decoding uses `fit-file-parser`, which requires Node.js 20+.
