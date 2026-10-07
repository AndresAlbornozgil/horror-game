import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let database: "ok" | "unavailable" = "ok";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    // The game works without the database for now, so report instead of failing.
    database = "unavailable";
  }
  return NextResponse.json({ status: "ok", database });
}
