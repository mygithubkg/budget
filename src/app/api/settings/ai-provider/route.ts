import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import * as admin from "firebase-admin";
import { encryptSecret } from "@/lib/encryption";

async function verifyUser(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch (err) {
    console.error("Failed to verify Firebase ID token in ai-provider route:", err);
    return null;
  }
}

/**
 * GET /api/settings/ai-provider
 * Returns whether BYOK is set, with provider, model, and masked last4.
 * Never returns the encrypted key or raw secret.
 */
export async function GET(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const docRef = adminDb
      .collection("users")
      .doc(uid)
      .collection("private")
      .doc("aiConfig");

    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ isSet: false });
    }

    const data = snap.data();
    if (!data || !data.isSet) {
      return NextResponse.json({ isSet: false });
    }

    return NextResponse.json({
      isSet: true,
      provider: data.provider,
      model: data.model,
      last4: data.last4,
      updatedAt: data.updatedAt ? data.updatedAt.toDate?.()?.toISOString?.() : null,
    });
  } catch (err: any) {
    console.error("GET /api/settings/ai-provider error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/ai-provider
 * Saves encrypted API key or resets to FinChat's default.
 */
export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const docRef = adminDb
      .collection("users")
      .doc(uid)
      .collection("private")
      .doc("aiConfig");

    // Revert to FinChat default
    if (body.mode === "default" || body.remove === true) {
      await docRef.set({
        isSet: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, isSet: false });
    }

    // Configure BYOK
    const { provider, model, apiKey } = body;

    if (!provider || !["groq", "gemini", "claude"].includes(provider)) {
      return NextResponse.json(
        { error: "Invalid provider. Must be 'groq', 'gemini', or 'claude'." },
        { status: 400 }
      );
    }

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 8) {
      return NextResponse.json(
        { error: "Valid API key is required (minimum 8 characters)." },
        { status: 400 }
      );
    }

    if (!model || typeof model !== "string" || !model.trim()) {
      return NextResponse.json(
        { error: "Model selection is required." },
        { status: 400 }
      );
    }

    const trimmedKey = apiKey.trim();
    const encrypted = encryptSecret(trimmedKey);
    const last4 = trimmedKey.slice(-4);

    await docRef.set({
      isSet: true,
      provider,
      model: model.trim(),
      encryptedKey: encrypted.encryptedKey,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      last4,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      isSet: true,
      provider,
      model: model.trim(),
      last4,
    });
  } catch (err: any) {
    console.error("POST /api/settings/ai-provider error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update AI provider configuration" },
      { status: 500 }
    );
  }
}
