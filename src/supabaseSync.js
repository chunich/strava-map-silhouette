const { createClient } = require("@supabase/supabase-js");
const config = require("../config");

let cachedClient;

/**
 * Returns a Supabase client for the processing pipeline (CommonJS context),
 * or `null` if Supabase isn't configured. Mirrors lib/db/supabaseClient.ts,
 * duplicated here because this file is required directly by index.js (plain
 * Node, not compiled by Next.js) and can't import a .ts module.
 */
function getSupabaseClient() {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const { url, serviceRoleKey } = config.supabase;
  if (!url || !serviceRoleKey) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

function isSupabaseConfigured() {
  return getSupabaseClient() !== null;
}

/**
 * Uploads the SVG + raw source file to Storage and upserts the run's
 * metadata/samples/polyline rows. No-ops when Supabase isn't configured, so
 * local file-based processing keeps working without any setup.
 */
async function syncRunToSupabase({
  filename,
  activityType,
  activityDate,
  titleLabel,
  metrics,
  svgContent,
  rawFileContent,
  rawFileExt,
  distanceTimeSamples,
  points,
}) {
  const client = getSupabaseClient();
  if (!client) {
    return false;
  }

  const svgStoragePath = filename;
  const rawStoragePath = filename.replace(/\.svg$/i, rawFileExt);

  const { error: svgUploadError } = await client.storage
    .from(config.supabase.buckets.runSvgs)
    .upload(svgStoragePath, Buffer.from(svgContent, "utf-8"), {
      contentType: "image/svg+xml",
      upsert: true,
    });
  if (svgUploadError) {
    throw new Error(
      `Failed to upload SVG to Supabase: ${svgUploadError.message}`,
    );
  }

  const { error: rawUploadError } = await client.storage
    .from(config.supabase.buckets.rawActivities)
    .upload(rawStoragePath, rawFileContent, { upsert: true });
  if (rawUploadError) {
    throw new Error(
      `Failed to upload raw file to Supabase: ${rawUploadError.message}`,
    );
  }

  const { data: runRow, error: upsertError } = await client
    .from("runs")
    .upsert(
      {
        source_filename: filename,
        activity_type: activityType,
        activity_date: activityDate,
        title_label: titleLabel,
        metrics: metrics || {},
        svg_storage_path: svgStoragePath,
        raw_storage_path: rawStoragePath,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_filename" },
    )
    .select("id")
    .single();
  if (upsertError) {
    throw new Error(
      `Failed to upsert run row in Supabase: ${upsertError.message}`,
    );
  }

  const runId = runRow.id;

  if (distanceTimeSamples && distanceTimeSamples.length) {
    const { error: samplesError } = await client.from("run_samples").upsert(
      {
        run_id: runId,
        distance_time_samples: distanceTimeSamples,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "run_id" },
    );
    if (samplesError) {
      throw new Error(
        `Failed to upsert run samples in Supabase: ${samplesError.message}`,
      );
    }
  }

  if (points && points.length) {
    const { error: pointsError } = await client.from("run_points").upsert(
      {
        run_id: runId,
        points,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "run_id" },
    );
    if (pointsError) {
      throw new Error(
        `Failed to upsert run points in Supabase: ${pointsError.message}`,
      );
    }
  }

  return true;
}

module.exports = { isSupabaseConfigured, syncRunToSupabase };
