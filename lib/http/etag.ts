import { createHash } from "node:crypto";

/**
 * Computes a strong ETag (quoted SHA-1 hex digest) from response content.
 * Used for JSON/SVG API responses that don't have a cheap filesystem mtime
 * to key off of (e.g. Supabase-backed reads), so clients can still issue
 * conditional GETs and get 304s instead of re-downloading unchanged data.
 */
export function computeEtag(content: Buffer | string): string {
  return `"${createHash("sha1").update(content).digest("hex")}"`;
}

/** Returns true if the request's If-None-Match header matches the given ETag. */
export function etagMatches(req: Request, etag: string): boolean {
  return req.headers.get("if-none-match") === etag;
}
