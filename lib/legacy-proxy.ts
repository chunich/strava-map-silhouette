import { NextRequest, NextResponse } from "next/server";

const legacyBaseUrl =
  process.env.NEXT_PUBLIC_LEGACY_API_BASE_URL || "http://localhost:3000";

export async function proxyToLegacy(request: NextRequest, targetPath: string) {
  const url = new URL(targetPath, legacyBaseUrl);
  const sourceUrl = new URL(request.url);

  sourceUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const init: RequestInit = {
    method: request.method,
    headers: filteredHeaders(request.headers),
    redirect: "follow",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  console.log(`[proxy] Fetching ${url.toString()}`);
  const response = await fetch(url, init);
  console.log(`[proxy] ${url.toString()} Got response: ${response.status}`);
  const body = await response.arrayBuffer();
  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");

  return new NextResponse(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function filteredHeaders(headers: Headers) {
  const nextHeaders = new Headers(headers);
  nextHeaders.delete("host");
  return nextHeaders;
}
