import { getSupabaseClient } from "@/lib/db/supabaseClient";
import config from "@/config";
import type { ImageMetadata } from "@/lib/api-types";

export { isSupabaseConfigured } from "@/lib/db/supabaseClient";

export interface RunRow {
  id: string;
  source_filename: string;
  activity_type: string;
  activity_date: string | null;
  title_label: string | null;
  metrics: Record<string, unknown>;
  svg_storage_path: string | null;
  raw_storage_path: string | null;
}

export interface DistanceTimeSample {
  distanceMiles: number;
  timeSeconds: number;
}

export interface RoutePoint {
  lat: number;
  lng: number;
}

function toImageMetadata(row: RunRow): ImageMetadata {
  return {
    titleLabel: row.title_label ?? undefined,
    metrics: row.metrics as ImageMetadata["metrics"],
  };
}

/**
 * Lists every run's filename + metadata, newest-filename-sort to match the
 * existing filesystem-based listing (alphabetical by filename, which embeds
 * the date as a prefix).
 */
export async function listRuns(): Promise<
  Array<{ filename: string; metadata: ImageMetadata }>
> {
  const client = getSupabaseClient();
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("runs")
    .select(
      "source_filename, activity_type, activity_date, title_label, metrics",
    )
    .order("source_filename", { ascending: true });

  if (error) {
    throw new Error(`Failed to list runs from Supabase: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    filename: row.source_filename,
    metadata: toImageMetadata(row as RunRow),
  }));
}

export async function getRunMetadata(
  filename: string,
): Promise<ImageMetadata | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from("runs")
    .select(
      "source_filename, activity_type, activity_date, title_label, metrics",
    )
    .eq("source_filename", filename)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load run metadata: ${error.message}`);
  }

  return data ? toImageMetadata(data as RunRow) : null;
}

export async function getRunSamples(
  filename: string,
): Promise<DistanceTimeSample[] | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const { data: run, error: runError } = await client
    .from("runs")
    .select("id")
    .eq("source_filename", filename)
    .maybeSingle();

  if (runError) {
    throw new Error(`Failed to look up run: ${runError.message}`);
  }
  if (!run) {
    return null;
  }

  const { data, error } = await client
    .from("run_samples")
    .select("distance_time_samples")
    .eq("run_id", run.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load run samples: ${error.message}`);
  }

  return data ? (data.distance_time_samples as DistanceTimeSample[]) : null;
}

export async function getRunSvg(filename: string): Promise<Buffer | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const { data: run, error: runError } = await client
    .from("runs")
    .select("svg_storage_path")
    .eq("source_filename", filename)
    .maybeSingle();

  if (runError) {
    throw new Error(`Failed to look up run: ${runError.message}`);
  }
  if (!run?.svg_storage_path) {
    return null;
  }

  const { data, error } = await client.storage
    .from(config.supabase.buckets.runSvgs)
    .download(run.svg_storage_path);

  if (error) {
    throw new Error(`Failed to download SVG from storage: ${error.message}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

export interface UpsertRunInput {
  filename: string;
  activityType: string;
  activityDate: string | null;
  titleLabel: string;
  metrics: Record<string, unknown>;
  svgContent: string;
  rawFileContent: Buffer;
  rawFileExt: string;
  distanceTimeSamples: DistanceTimeSample[];
  points: RoutePoint[];
}

/**
 * Uploads the SVG + raw source file to Storage and upserts the run's
 * metadata, samples, and polyline rows. No-ops (returns false) when
 * Supabase isn't configured, so callers can keep writing local files as the
 * source of truth until a project is set up.
 */
export async function upsertRun(input: UpsertRunInput): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    return false;
  }

  const svgStoragePath = input.filename;
  const rawStoragePath = input.filename.replace(/\.svg$/i, input.rawFileExt);

  const { error: svgUploadError } = await client.storage
    .from(config.supabase.buckets.runSvgs)
    .upload(svgStoragePath, Buffer.from(input.svgContent, "utf-8"), {
      contentType: "image/svg+xml",
      upsert: true,
    });
  if (svgUploadError) {
    throw new Error(`Failed to upload SVG: ${svgUploadError.message}`);
  }

  const { error: rawUploadError } = await client.storage
    .from(config.supabase.buckets.rawActivities)
    .upload(rawStoragePath, input.rawFileContent, { upsert: true });
  if (rawUploadError) {
    throw new Error(`Failed to upload raw file: ${rawUploadError.message}`);
  }

  const { data: runRow, error: upsertError } = await client
    .from("runs")
    .upsert(
      {
        source_filename: input.filename,
        activity_type: input.activityType,
        activity_date: input.activityDate,
        title_label: input.titleLabel,
        metrics: input.metrics,
        svg_storage_path: svgStoragePath,
        raw_storage_path: rawStoragePath,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_filename" },
    )
    .select("id")
    .single();

  if (upsertError) {
    throw new Error(`Failed to upsert run row: ${upsertError.message}`);
  }

  const runId = runRow.id as string;

  if (input.distanceTimeSamples.length) {
    const { error: samplesError } = await client.from("run_samples").upsert(
      {
        run_id: runId,
        distance_time_samples: input.distanceTimeSamples,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "run_id" },
    );
    if (samplesError) {
      throw new Error(`Failed to upsert samples: ${samplesError.message}`);
    }
  }

  if (input.points.length) {
    const { error: pointsError } = await client.from("run_points").upsert(
      {
        run_id: runId,
        points: input.points,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "run_id" },
    );
    if (pointsError) {
      throw new Error(`Failed to upsert points: ${pointsError.message}`);
    }
  }

  return true;
}
