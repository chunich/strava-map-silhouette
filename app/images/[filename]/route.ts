import { NextRequest } from "next/server";
import { proxyToLegacy } from "@/lib/legacy-proxy";

export async function GET(
  request: NextRequest,
  context: { params: { filename: string } },
) {
  return proxyToLegacy(request, `/images/${context.params.filename}`);
}
