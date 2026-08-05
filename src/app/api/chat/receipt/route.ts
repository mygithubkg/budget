import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getVisionAICompletion, BYOKError } from "@/lib/ai/aiProvider";
import { matchCategory } from "@/lib/category-utils";
import { ParsedExpense } from "@/types";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
    }

    const uid = decodedToken.uid;
    const body = await req.json();
    const { image, todayDate = format(new Date(), "yyyy-MM-dd") } = body;

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "Valid base64 image data is required" },
        { status: 400 }
      );
    }

    // 2. Load existing user categories for deduplication
    const categoriesSnapshot = await adminDb
      .collection("users")
      .doc(uid)
      .collection("categories")
      .get();

    const categoryList: string[] = categoriesSnapshot.docs.map(
      (doc) => doc.data().name as string
    );

    // 3. Construct System Prompt
    const systemPrompt = `You are extracting line items from a photo of a receipt for a personal finance ledger. Return ONLY valid JSON with no markdown formatting or prose:
{
  "merchant": string | null,
  "date": "YYYY-MM-DD" | null,
  "items": [
    { "description": string, "amount": number, "category": string }
  ],
  "total": number,
  "needsReview": boolean
}
Existing categories: [${categoryList.map((c) => `"${c}"`).join(", ")}].
Today's date is: ${todayDate}.
If an individual line item's category closely matches an existing category, use the exact existing category name.
If a receipt only shows a single consolidated total without line items, create 1 item with the total and merchant name.
Set needsReview to true if the receipt is blurry, partially cropped, or line items are ambiguous.`;

    // 4. Call Vision AI
    const visionResult = await getVisionAICompletion(uid, systemPrompt, image);

    // 5. Parse JSON
    let parsed: any;
    try {
      let rawText = visionResult.content.trim();
      if (rawText.startsWith("```json")) {
        rawText = rawText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (rawText.startsWith("```")) {
        rawText = rawText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      console.error("Failed to parse vision model JSON output:", visionResult.content);
      return NextResponse.json(
        { error: "Could not extract structured data from receipt. Please try taking a clearer photo." },
        { status: 422 }
      );
    }

    const merchant = parsed.merchant || null;
    const receiptDate = parsed.date || todayDate;
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const total = typeof parsed.total === "number" ? parsed.total : 0;
    const needsReview = Boolean(parsed.needsReview);

    // 6. Map to ParsedExpense array with category matching
    const transactions: ParsedExpense[] = items.map((item: any) => {
      const amt = typeof item.amount === "number" ? Math.abs(item.amount) : 0;
      const matchedCat = matchCategory(item.category || "General", categoryList);
      const desc =
        item.description || (merchant ? `${merchant} item` : "Receipt item");

      return {
        type: "expense",
        totalAmount: amt,
        userShare: amt,
        description: desc,
        category: matchedCat,
        date: receiptDate,
        splits: [],
        needsClarification: needsReview,
        clarificationQuestion: needsReview
          ? `Receipt from ${merchant || "merchant"} scanned. Please review line items before confirming.`
          : undefined,
      };
    });

    // If no items were parsed but a total exists, create a fallback entry
    if (transactions.length === 0 && total > 0) {
      transactions.push({
        type: "expense",
        totalAmount: total,
        userShare: total,
        description: merchant ? `Purchase at ${merchant}` : "Receipt expense",
        category: "General",
        date: receiptDate,
        splits: [],
        needsClarification: needsReview,
      });
    }

    return NextResponse.json({
      success: true,
      merchant,
      date: receiptDate,
      total,
      needsReview,
      transactions,
      modelUsed: visionResult.modelUsed,
      isBYOK: visionResult.isBYOK,
    });
  } catch (error: any) {
    console.error("Receipt processing API error:", error);
    if (error instanceof BYOKError) {
      return NextResponse.json(
        { error: error.userFriendlyMessage, isBYOK: true },
        { status: error.statusCode || 400 }
      );
    }
    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to process receipt photo. Please try again or enter details manually.",
      },
      { status: 500 }
    );
  }
}
