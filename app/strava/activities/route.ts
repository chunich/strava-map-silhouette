import { NextRequest } from "next/server";
import { proxyToLegacy } from "@/lib/legacy-proxy";

export async function GET(request: NextRequest) {
  return proxyToLegacy(request, "/strava/activities");
}
