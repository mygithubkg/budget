import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { StatementPayload } from "@/app/statement/page";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * Generate a short, URL-friendly random ID (8 chars)
 */
function generateShortId(): string {
  return crypto.randomBytes(6).toString("base64url").slice(0, 8);
}

/**
 * POST /api/statement
 * Saves a statement payload and returns a short ID.
 */
export async function POST(req: NextRequest) {
  try {
    const body: StatementPayload = await req.json();

    if (!body.owner || !body.friend || typeof body.balance !== "number") {
      return NextResponse.json(
        { error: "Invalid statement payload: missing owner, friend, or balance." },
        { status: 400 }
      );
    }

    const shortId = generateShortId();
    const docRef = adminDb.collection("shared_statements").doc(shortId);

    await docRef.set({
      owner: body.owner,
      friend: body.friend,
      currency: body.currency || "INR",
      balance: Number(body.balance) || 0,
      upiId: body.upiId || null,
      generatedAt: body.generatedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      entries: (body.entries || []).slice(0, 100).map((e: any) => ({
        id: e.id || null,
        note: e.note || "",
        amount: Number(e.amount) || 0,
        type: e.type || "owe",
        direction: e.direction || null,
        date: String(e.date || ""),
      })),
    });

    return NextResponse.json({
      id: shortId,
      success: true,
    });
  } catch (error: any) {
    console.error("Error creating shared statement:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate statement short-link" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/statement?id=xxx
 * Retrieves a statement by its short ID.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing statement ID" }, { status: 400 });
    }

    const docSnap = await adminDb.collection("shared_statements").doc(id).get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Statement not found or expired" }, { status: 404 });
    }

    const data = docSnap.data() as StatementPayload;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error retrieving shared statement:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve statement" },
      { status: 500 }
    );
  }
}
