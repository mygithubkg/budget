import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: false,
    disabled: true,
    message: "Markets refresh cron is disabled.",
  });
}
