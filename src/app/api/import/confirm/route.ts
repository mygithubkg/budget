import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import * as admin from "firebase-admin";
import { ImportPreviewItem } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    // 2. Validate payload
    const body = await req.json();
    const { items, fileName } = body as {
      items: ImportPreviewItem[];
      fileName?: string;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No transactions provided to import" },
        { status: 400 }
      );
    }

    // Filter to selected items only
    const selectedItems = items.filter((item) => item.selected);
    if (selectedItems.length === 0) {
      return NextResponse.json(
        { error: "No transactions selected for import" },
        { status: 400 }
      );
    }

    const transactionsCol = adminDb
      .collection("users")
      .doc(uid)
      .collection("transactions");

    // Process in batches of 400 (Firestore writeBatch limit is 500)
    const BATCH_SIZE = 400;
    let totalImported = 0;

    for (let i = 0; i < selectedItems.length; i += BATCH_SIZE) {
      const chunk = selectedItems.slice(i, i + BATCH_SIZE);
      const batch = adminDb.batch();

      for (const item of chunk) {
        const newDocRef = transactionsCol.doc();
        const txDate = new Date(item.date);
        const validDate = isNaN(txDate.getTime()) ? new Date() : txDate;

        batch.set(newDocRef, {
          type: item.type || "expense",
          amount: Math.abs(Number(item.amount) || 0),
          userShare: Math.abs(Number(item.userShare) || Number(item.amount) || 0),
          description: item.description || "Imported transaction",
          category: item.category || "General",
          date: admin.firestore.Timestamp.fromDate(validDate),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          rawInput: `Imported from ${fileName || "file"}: ${item.description}`,
          source: "import",
          splits: Array.isArray(item.splits) ? item.splits : [],
        });
      }

      await batch.commit();
      totalImported += chunk.length;
    }

    return NextResponse.json({
      success: true,
      importedCount: totalImported,
    });
  } catch (error: any) {
    console.error("Error in /api/import/confirm:", error);
    return NextResponse.json(
      { error: error.message || "Failed to commit imported transactions" },
      { status: 500 }
    );
  }
}
