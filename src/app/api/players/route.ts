import { NextResponse } from "next/server";

// Reserved for persistent player data (profiles, stats). Live players are managed by the Socket.IO server.
export function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
