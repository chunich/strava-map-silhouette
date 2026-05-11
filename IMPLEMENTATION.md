# Runtime Implementation Summary

## Current Architecture

This project now runs as a Next.js App Router application with API handlers under `/api/*`.

Implemented API routes:

- `GET /api/health`
- `GET /api/images`
- `GET /api/images/:filename`
- `POST /api/images/generate`
- `POST /api/images/generate-from-strava`
- `POST /api/images/stitch`
- `GET /api/strava/activities`

## How to Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo

Open `http://localhost:3000/legacy-demo` to use the existing `demo.html` UI served by Next.js.

## Configuration

Configuration is centralized in `config.js` and loaded from `.env`.

Key variables:

- `PORT`
- `SOURCE_DIR`
- `OUTPUT_DIR`
- `FILTER_TYPE`
- `ACTIVITY_LOOKUP_DAYS`
- `IMAGE_WIDTH`
- `IMAGE_HEIGHT`

## CLI

The original CLI flow remains available:

```bash
npm run legacy:cli
```
