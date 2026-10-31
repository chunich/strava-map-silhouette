-- Supabase schema for strava-map-silhouette
-- Run this once in the Supabase SQL editor (or via `supabase db push`) after
-- creating a new project, before running scripts/backfillToSupabase.js.

create extension if not exists vector;
create extension if not exists postgis;

-- One row per processed run. Mirrors the data previously stored in
-- output_files/<name>.json
create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  source_filename text not null unique, -- e.g. "2026-07-02_running_478609817062113283.svg"
  activity_type text not null,
  activity_date date,
  title_label text,
  metrics jsonb not null default '{}'::jsonb,
  svg_storage_path text, -- path within the "run-svgs" storage bucket
  raw_storage_path text, -- path within the "raw-activities" storage bucket
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists runs_activity_date_idx on runs (activity_date);

-- Distance/time samples used for the pace chart. Mirrors
-- output_files/<name>.samples.json
create table if not exists run_samples (
  run_id uuid primary key references runs (id) on delete cascade,
  distance_time_samples jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Full lat/lng polyline per run (absolute GPS coordinates), stored now for a
-- future "find similar-shaped routes" feature. Not read by the app yet.
create table if not exists run_points (
  run_id uuid primary key references runs (id) on delete cascade,
  points jsonb not null default '[]'::jsonb, -- [{ "lat": number, "lng": number }, ...]
  updated_at timestamptz not null default now()
);

-- The app only ever talks to these tables using the service-role key
-- (server-side only, see lib/db/supabaseClient.ts / src/supabaseSync.js),
-- which bypasses Row Level Security. Enabling RLS here with no policies
-- means the public anon key (if ever exposed client-side) gets zero access
-- to this data via the auto-exposed Data API.
alter table runs enable row level security;
alter table run_samples enable row level security;
alter table run_points enable row level security;

-- Storage buckets (create via Supabase dashboard or supabase-js at setup time):
--   raw-activities  (private) - original uploaded .gpx/.tcx/.fit files, kept forever
--   run-svgs        (public or signed-URL)  - generated silhouette SVGs
