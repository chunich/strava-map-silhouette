import { NextResponse } from "next/server";

export function notImplemented(path: string) {
  return NextResponse.json(
    {
      error: "Not implemented",
      message: `Endpoint ${path} is scaffolded and pending migration from Express.`,
    },
    { status: 501 },
  );
}
