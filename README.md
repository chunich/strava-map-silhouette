# strava-map-silhouette

Option 1 migration baseline: monolithic Next.js app (frontend + backend in one codebase).

## Current Status

- Next.js App Router scaffold added under `app/`
- API route placeholders added under `app/api/`
- Existing Express implementation is kept for incremental migration
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
- `npm run server` - Run legacy Express server with nodemon

## Environment Variables

Copy `.env.example` to `.env` and fill values.

Important fields:

- `ACTIVITY_LOOKUP_DAYS`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_ACCESS_TOKEN`
- `STRAVA_REFRESH_TOKEN`
- `STRAVA_EXPIRES_AT`

## API Migration Plan

These Next.js route handlers are scaffolded and return `501 Not implemented` unless noted:

- `GET /api/images`
- `GET /api/images/[filename]`
- `POST /api/images/generate`
- `POST /api/images/generate-from-strava`
- `POST /api/images/stitch`
- `GET /api/strava/activities`
- `GET /api/health` (implemented baseline)

Suggested migration order:

1. `GET /api/health`
2. `GET /api/images`
3. `GET /api/images/[filename]`
4. `GET /api/strava/activities`
5. `POST /api/images/generate-from-strava`
6. `POST /api/images/generate`
7. `POST /api/images/stitch`

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Legacy bridge:

- Open `http://localhost:3000/legacy-demo` to run the existing `demo.html` through Next.js during migration.
- Set `NEXT_PUBLIC_LEGACY_API_BASE_URL` if the legacy Express server is running on a different port than Next.js.

## Notes

- During migration, you can still run the legacy Express API with `npm run server`.
- Keep legacy files until each endpoint is ported and validated.
