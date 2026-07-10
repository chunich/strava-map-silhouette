import { NextResponse } from "next/server";
import config from "@/config";
import { processStravaActivities } from "@/src/processStravaActivities";
import { StravaClient } from "@/src/stravaService";

// Initialize Strava client with config values
const client = new StravaClient({
  clientId: config.strava.clientId || "CLIENT_ID",
  clientSecret: config.strava.clientSecret || "CLIENT_SECRET",
  accessToken: config.strava.accessToken || "CURRENT_ACCESS_TOKEN",
  refreshToken: config.strava.refreshToken || "CURRENT_REFRESH_TOKEN",
  expiresAt: Number(process.env.STRAVA_EXPIRES_AT || 1234567890),
  onTokenRefresh: async (newTokens: unknown) => {
    console.log("Tokens refreshed:", newTokens);
  },
});

// POST /api/images/generate-from-strava
export async function POST(request: Request) {
  try {
    console.log(
      "[POST /api/images/generate-from-strava] Starting generation from Strava API",
    );

    const body = await request.json().catch(() => ({}));

    const daysSince = config.strava.activityLookupDays;
    const defaultAfterEpoch =
      Math.floor(Date.now() / 1000) - daysSince * 24 * 60 * 60;

    // Fetch activities from Strava
    const activities = await client.getAllActivities({
      after: body.after ?? defaultAfterEpoch,
      before: body.before ?? null,
    });

    console.log(
      `[POST /api/images/generate-from-strava] Fetched activities:`,
      activities.length,
    );

    if (activities.length === 0) {
      return NextResponse.json(
        {
          error: "No activities found",
          hint: "Check your date range or token permissions",
        },
        { status: 404 },
      );
    }

    console.log(`Found ${activities.length} Strava activities`);

    const options = {
      filterType: "Run",
      minimumDistance: config.filter.minimumDistance,
      width: config.draw.width,
      height: config.draw.height,
      colors: config.draw.colors,
      strokeWidth: config.draw.strokeWidth,
      aspectRatio: config.draw.aspectRatio,
      offsetX: config.draw.offsetX,
      offsetY: config.draw.offsetY,
      verbose: false,
    };

    const results = await processStravaActivities(
      activities,
      config.paths.outputDir,
      options,
    );

    const successful = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "error").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    if (successful === 0) {
      return NextResponse.json(
        {
          error: "No valid tracks found",
          hint: "Activities may be filtered out or missing GPS polyline data",
        },
        { status: 404 },
      );
    }

    console.log(
      `[POST /api/images/generate-from-strava] Complete: ${successful} successful, ${failed} failed, ${skipped} skipped`,
    );

    return NextResponse.json({
      message: "Strava image generation complete",
      summary: {
        total: results.length,
        successful,
        failed,
        skipped,
      },
    });
  } catch (error) {
    console.error("[POST /api/images/generate-from-strava] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";
    console.error("[POST /api/images/generate-from-strava] Stack:", errorStack);
    return NextResponse.json(
      {
        error: "Failed to generate images from Strava",
        message: errorMessage,
        hint: "Check Strava token validity and permissions in .env",
      },
      { status: 500 },
    );
  }
}
