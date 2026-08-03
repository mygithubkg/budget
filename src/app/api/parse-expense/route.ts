import { NextRequest, NextResponse } from "next/server";
import { POST as chatHandler } from "@/app/api/chat/route";

export async function POST(req: NextRequest) {
  // Delegate directly to the new Intent Router
  return chatHandler(req);
}
