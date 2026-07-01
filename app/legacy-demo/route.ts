import { readFile } from "node:fs/promises";
import path from "node:path";

const DEMO_FILE_PATH = path.join(process.cwd(), "demo.html");

export async function GET() {
  const html = await readFile(DEMO_FILE_PATH, "utf-8");
  const apiBase = "";

  const disclaimer = `
  <div style="padding:12px 2rem 0;color:#d1d5db;font-family:ui-sans-serif,system-ui,sans-serif;">
    <div>Legacy demo served by Next.js. </div>
    <div>API target: <strong>${apiBase || "same-origin /api"}</strong></div>
    <div>Back to <a href="/">home</a></div>
  </div>
  `;
  const patchedHtml = html
    .replace(
      'const API_BASE = "http://localhost:3000";',
      `const API_BASE = ${JSON.stringify(apiBase)};`,
    )
    .replace("<body>", `<body>${disclaimer}`);

  return new Response(patchedHtml, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
