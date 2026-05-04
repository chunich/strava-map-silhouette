import { NextRequest } from "next/server";
import { proxyToLegacy } from "@/lib/legacy-proxy";

export async function POST(request: NextRequest) {
  return proxyToLegacy(request, "/images/stitch");
}
