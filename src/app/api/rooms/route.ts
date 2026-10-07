import { NextResponse } from "next/server";

// Reserved for persistent room/match data (match history). Live rooms are managed by the Socket.IO server.
export function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
