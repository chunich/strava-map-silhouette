import { NextRequest } from "next/server";
import { proxyToLegacy } from "@/lib/legacy-proxy";

export async function GET(request: NextRequest) {
  console.log("Proxying request to /images");
  return proxyToLegacy(request, "/images");
}
