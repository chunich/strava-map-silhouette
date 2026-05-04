import { readFile } from "node:fs/promises";
import path from "node:path";

const DEMO_FILE_PATH = path.join(process.cwd(), "demo.html");

export async function GET() {
  const html = await readFile(DEMO_FILE_PATH, "utf-8");
  const legacyApiBase = process.env.NEXT_PUBLIC_LEGACY_API_BASE_URL || "";

  const patchedHtml = html
    .replace(
      'const API_BASE = "http://localhost:3000";',
      `const API_BASE = ${JSON.stringify(legacyApiBase)};`,
    )
    .replace(
      "<body>",
      `<body><div style=\"padding:12px 2rem 0;color:#d1d5db;font-family:ui-sans-serif,system-ui,sans-serif;\">Legacy demo served by Next.js. API target: <strong>${legacyApiBase}</strong></div>`,
    );

  return new Response(patchedHtml, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
