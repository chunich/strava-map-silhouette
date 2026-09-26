import { NextResponse } from "next/server";
import config from "@/config";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    config: {
      sourceDir: config.paths.sourceDir,
      outputDir: config.paths.outputDir,
      filterType: config.filter.type,
      activityLookupDays: config.strava.activityLookupDays,
    },
  });
}
