import { NextResponse } from "next/server";
import config from "@/config";
import { StravaClient } from "@/src/stravaService";

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

export async function GET() {
  try {
    const daysSince = config.strava.activityLookupDays;
    const afterEpoch = Math.floor(Date.now() / 1000) - daysSince * 24 * 60 * 60;
    const activities = await client.getAllActivities({
      after: afterEpoch,
      before: null,
    });
    return NextResponse.json({
      message: `Activities fetched successfully (Last ${daysSince} days; ${activities.length} activities)`,
      activities,
    });
  } catch (error) {
    console.error("[GET /api/strava/activities] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch activities",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
