import { NextRequest, NextResponse } from "next/server";
import { parseExpenseRequestSchema } from "@/lib/validations";
import { adminAuth } from "@/lib/firebase/admin";
import { processIncomingMessage } from "@/lib/chat/processMessage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Authorization header if present
    const authHeader = req.headers.get("authorization");
    let userId = "anonymous-user";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1];
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        userId = decoded.uid;
      } catch (authErr) {
        console.warn("Token verification skipped or failed in development:", authErr);
      }
    }

    // 2. Validate request body
    const body = await req.json();
    const parsedBody = parseExpenseRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsedBody.error.format() },
        { status: 400 }
      );
    }

    const { message, categoryList, friendList, todayDate, conversationHistory = [] } =
      parsedBody.data;

    // 3. Delegate to transport-agnostic processing core
    const result = await processIncomingMessage(
      userId,
      message,
      conversationHistory,
      {
        categoryList,
        friendList,
        todayDate,
      }
    );

    // Format response maintaining full backward compatibility with web chat client
    return NextResponse.json({
      intent: result.intent,
      transactions: result.transactions,
      transaction:
        result.transactions && result.transactions.length > 0
          ? result.transactions[0]
          : null,
      queryType: result.queryType,
      modelUsed: result.modelUsed,
      rateLimitExhausted: result.rateLimitExhausted,
      replyText: result.replyText,
    });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
