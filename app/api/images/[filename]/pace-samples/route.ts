import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import config from "@/config";
import { parseTCX } from "@/src/tcxParser";
import { parseGPX } from "@/src/gpxParser";
import { parseFIT } from "@/src/fitParser";
import { BEST_EFFORT_DISTANCES, findBestEffortWindow } from "@/src/bestEffort";

const ALLOWED_EXTENSIONS = new Set([".gpx", ".tcx", ".fit"]);

// Cap the number of points returned for the chart line to keep payloads
// small; the fastest-window search itself still runs over full-resolution
// samples so the highlighted segment stays accurate.
const DEFAULT_MAX_CHART_POINTS = 300;
const MIN_MAX_CHART_POINTS = 100;
const MAX_MAX_CHART_POINTS = 5000;

// Trailing time window used to smooth instantaneous pace. Raw adjacent-sample
// pace is too noisy (GPS/FIT distance fields are quantized to ~1-2m steps per
// 1s sample, which creates an artificial sawtooth), so a few seconds of
// smoothing removes that quantization artifact while still preserving real
// jitter in the pace trace.
const DEFAULT_PACE_WINDOW_SECONDS = 26;
const MIN_PACE_WINDOW_SECONDS = 1;
const MAX_PACE_WINDOW_SECONDS = 60;

// When forward progress within the rolling window is below this distance,
// treat the runner as stopped/stalled. Rather than showing a gap or an
// unrealistic pace spike, the chart flatlines at CUTOFF_PACE_SECONDS_PER_MILE
// for that stretch, matching how Strava/COROS render stopped segments.
const STOPPED_DISTANCE_THRESHOLD_MILES = 0.001;
const CUTOFF_PACE_SECONDS_PER_MILE = 900; // 15:00/mi

// GPS/FIT distance fields are quantized to ~1-2m steps per 1s sample, which
// can occasionally line up with a short trailing window to produce a
// physically implausible "instantaneous" pace spike that isn't real speed.
// Rather than a fixed global floor, derive the fastest-plausible pace from
// this run's own smoothed pace distribution (COROS does the same: its chart
// axis is scaled to the run's actual data range, and outlier spikes get
// visually clipped flat at that bound). Using a low percentile instead of
// the true minimum filters out single-sample quantization outliers while
// still respecting how fast this particular run genuinely got.
const DYNAMIC_FLOOR_PERCENTILE = 0.02;
// Absolute safety net regardless of percentile result, so a very short or
// noisy run can't produce a nonsensically fast floor.
const ABSOLUTE_MIN_PACE_SECONDS_PER_MILE = 180; // 3:00/mi

function computeDynamicPaceFloor(sortedRealPaces: number[]): number {
  if (sortedRealPaces.length === 0) return ABSOLUTE_MIN_PACE_SECONDS_PER_MILE;
  const index = Math.floor(
    DYNAMIC_FLOOR_PERCENTILE * (sortedRealPaces.length - 1),
  );
  return Math.max(sortedRealPaces[index], ABSOLUTE_MIN_PACE_SECONDS_PER_MILE);
}

type DistanceTimeSample = { distanceMiles: number; timeSeconds: number };

type BestWindow = {
  durationSeconds: number;
  startTimeSeconds: number;
  endTimeSeconds: number;
  startDistanceMiles: number;
  endDistanceMiles: number;
};

type ChartPoint = {
  timeSeconds: number;
  distanceMiles: number;
  paceSecondsPerMile: number | null;
};

// Compute an instantaneous pace per sample using a short trailing time
// window (smooths GPS/FIT distance quantization noise), then stride-thin the
// series so the client receives a manageable number of points while
// preserving a dense, jittery pace trace similar to COROS/Strava.
function buildChartSeries(
  samples: DistanceTimeSample[],
  paceWindowSeconds: number,
  maxChartPoints: number,
): ChartPoint[] {
  const raw: Array<{
    timeSeconds: number;
    distanceMiles: number;
    paceSecondsPerMile: number | null;
    isStopped: boolean;
  }> = [];
  const realPaces: number[] = [];
  let behindIndex = 0;

  for (let index = 0; index < samples.length; index++) {
    const sample = samples[index];

    while (
      behindIndex < index &&
      sample.timeSeconds - samples[behindIndex].timeSeconds > paceWindowSeconds
    ) {
      behindIndex++;
    }

    const behind = samples[behindIndex];
    const distanceDelta = sample.distanceMiles - behind.distanceMiles;
    const timeDelta = sample.timeSeconds - behind.timeSeconds;

    let paceSecondsPerMile: number | null = null;
    let isStopped = false;
    if (timeDelta > 0) {
      isStopped = distanceDelta <= STOPPED_DISTANCE_THRESHOLD_MILES;
      paceSecondsPerMile = isStopped
        ? CUTOFF_PACE_SECONDS_PER_MILE
        : Math.min(timeDelta / distanceDelta, CUTOFF_PACE_SECONDS_PER_MILE);
      if (!isStopped) realPaces.push(paceSecondsPerMile);
    }

    raw.push({
      timeSeconds: sample.timeSeconds,
      distanceMiles: sample.distanceMiles,
      paceSecondsPerMile,
      isStopped,
    });
  }

  realPaces.sort((a, b) => a - b);
  const dynamicFloor = computeDynamicPaceFloor(realPaces);

  const withPace: ChartPoint[] = raw.map((point) => ({
    timeSeconds: point.timeSeconds,
    distanceMiles: point.distanceMiles,
    paceSecondsPerMile:
      point.paceSecondsPerMile === null || point.isStopped
        ? point.paceSecondsPerMile
        : Math.max(point.paceSecondsPerMile, dynamicFloor),
  }));

  const stride = Math.max(1, Math.ceil(withPace.length / maxChartPoints));
  const thinned = withPace.filter((_, index) => index % stride === 0);

  const last = withPace[withPace.length - 1];
  if (thinned.length === 0 || thinned[thinned.length - 1] !== last) {
    thinned.push(last);
  }

  return thinned;
}

function clampInt(
  rawValue: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = rawValue == null ? NaN : Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

// GET /api/images/:filename/pace-samples
// Locates the matching source (.gpx/.tcx/.fit) file for a given output
// filename, re-parses it on demand, and returns a chartable pace-over-time
// series plus the fastest window found for each standard race distance.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> | { filename: string } },
) {
  let filename = "";

  try {
    ({ filename } = await Promise.resolve(params));

    const { searchParams } = new URL(req.url);
    const maxChartPoints = clampInt(
      searchParams.get("maxChartPoints"),
      DEFAULT_MAX_CHART_POINTS,
      MIN_MAX_CHART_POINTS,
      MAX_MAX_CHART_POINTS,
    );
    const paceWindowSeconds = clampInt(
      searchParams.get("paceWindowSeconds"),
      DEFAULT_PACE_WINDOW_SECONDS,
      MIN_PACE_WINDOW_SECONDS,
      MAX_PACE_WINDOW_SECONDS,
    );

    if (!filename) {
      return NextResponse.json(
        {
          error: "Missing filename",
          message: "Filename route parameter is required",
        },
        { status: 400 },
      );
    }

    const stem = filename.replace(/\.(svg|png|json)$/i, "");

    let sourceEntries: string[];
    try {
      sourceEntries = await readdir(config.paths.sourceDir);
    } catch {
      return NextResponse.json(
        { error: "Source directory not found", path: config.paths.sourceDir },
        { status: 400 },
      );
    }

    let matchedSourcePath: string | null = null;
    for (const entry of sourceEntries) {
      const ext = path.extname(entry).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) continue;
      const baseName = path.basename(entry, ext);
      if (stem.endsWith("_" + baseName)) {
        matchedSourcePath = path.join(config.paths.sourceDir, entry);
        break;
      }
    }

    if (!matchedSourcePath) {
      return NextResponse.json(
        {
          error: "Source file not found",
          filename,
          hint: "No matching .gpx/.tcx/.fit file for this run",
        },
        { status: 404 },
      );
    }

    const ext = path.extname(matchedSourcePath).toLowerCase();
    let distanceTimeSamples: DistanceTimeSample[] | undefined;

    if (ext === ".fit") {
      const buffer = await readFile(matchedSourcePath);
      const activity = (await parseFIT(buffer)) as {
        distanceTimeSamples?: DistanceTimeSample[];
      };
      distanceTimeSamples = activity.distanceTimeSamples;
    } else if (ext === ".tcx") {
      const content = await readFile(matchedSourcePath, "utf-8");
      const activity = parseTCX(content) as {
        distanceTimeSamples?: DistanceTimeSample[];
      };
      distanceTimeSamples = activity.distanceTimeSamples;
    } else if (ext === ".gpx") {
      const content = await readFile(matchedSourcePath, "utf-8");
      const activity = parseGPX(content) as {
        distanceTimeSamples?: DistanceTimeSample[];
      };
      distanceTimeSamples = activity.distanceTimeSamples;
    }

    if (!distanceTimeSamples || distanceTimeSamples.length < 2) {
      return NextResponse.json(
        {
          error: "No sample data",
          message: "This run has no GPS/time samples to chart",
        },
        { status: 422 },
      );
    }

    // Normalize so the chart always starts at distance 0 / time 0.
    const startTime = distanceTimeSamples[0].timeSeconds;
    const startDistance = distanceTimeSamples[0].distanceMiles;
    const normalized = distanceTimeSamples.map((sample) => ({
      distanceMiles: sample.distanceMiles - startDistance,
      timeSeconds: sample.timeSeconds - startTime,
    }));

    const bestWindows: Record<string, BestWindow | null> = {};
    for (const { key, miles } of BEST_EFFORT_DISTANCES) {
      bestWindows[key] = findBestEffortWindow(normalized, miles);
    }

    const points = buildChartSeries(
      normalized,
      paceWindowSeconds,
      maxChartPoints,
    );

    return NextResponse.json({ points, bestWindows });
  } catch (error) {
    console.error(
      `[GET /api/images/${filename}/pace-samples] Error:`,
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      {
        error: "Failed to compute pace samples",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
