# strava-map-silhouette

Option 1 migration baseline: monolithic Next.js app (frontend + backend in one codebase).

## Current Status

- Next.js App Router is the active runtime under `app/`
- API endpoints are implemented under `app/api/`
- Existing processing modules under `src/` are retained

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Existing Node modules for parsing, Strava, and image generation (`sharp`, TCX/GPX tooling)

## Scripts

- `npm run dev` - Start Next.js dev server
- `npm run build` - Build Next.js app
- `npm run start` - Start production Next.js app
- `npm run lint` - Run Next.js lint
- `npm run legacy:cli` - Run old CLI flow (`index.js`)

## Environment Variables

Copy `.env.example` to `.env` and fill values.

Important fields:

- `ACTIVITY_LOOKUP_DAYS`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_ACCESS_TOKEN`
- `STRAVA_REFRESH_TOKEN`
- `STRAVA_EXPIRES_AT`

## API Endpoints

Implemented Next.js route handlers:

- `GET /api/images`
- `GET /api/images/[filename]`
- `POST /api/images/generate`
- `POST /api/images/generate-from-strava`
- `POST /api/images/stitch`
- `GET /api/strava/activities`
- `GET /api/health`

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Notes

- The legacy Express `server.js` runtime has been retired.
