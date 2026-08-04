import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { processIncomingMessage } from "@/lib/chat/processMessage";
import { commitParsedTransactions } from "@/lib/firebase/serverTransactions";
import {
  sendTelegramMessage,
  sendChatAction,
  editMessageText,
  answerCallbackQuery,
  formatTelegramExpenseMessage,
  getConfirmationKeyboard,
  formatTelegramStatusQuery,
  escapeHtml,
} from "@/lib/telegram/bot";
import { OFF_TOPIC_RESPONSE } from "@/lib/validations";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Telegram secret token header
    const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
    const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (configuredSecret && secretHeader !== configuredSecret) {
      console.warn("Telegram webhook secret mismatch.");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();

    // 2. Handle Inline Button Callback Queries (Confirm / Cancel)
    if (body.callback_query) {
      await handleCallbackQuery(body.callback_query);
      return NextResponse.json({ ok: true });
    }

    // 3. Handle Chat Messages
    if (body.message) {
      await handleChatMessage(body.message);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error processing Telegram webhook update:", error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

/**
 * Handle Inline Keyboard Button Taps
 */
async function handleCallbackQuery(callbackQuery: any) {
  const queryId = callbackQuery.id;
  const data = callbackQuery.data as string;
  const chatId = callbackQuery.message?.chat?.id;
  const messageId = callbackQuery.message?.message_id;

  if (!data || !chatId || !messageId) {
    await answerCallbackQuery(queryId, "Action could not be processed.");
    return;
  }

  const [action, sessionId] = data.split(":");
  if (!sessionId) {
    await answerCallbackQuery(queryId, "Invalid session data.");
    return;
  }

  const sessionRef = adminDb.collection("telegramSessions").doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    await answerCallbackQuery(
      queryId,
      "This confirmation session has expired. Please send your expense again.",
      true
    );
    await editMessageText(
      chatId,
      messageId,
      "⚠️ <i>This session has expired. Please re-send your message to log this expense.</i>"
    );
    return;
  }

  const session = sessionDoc.data();

  if (session?.status !== "pending") {
    const statusMsg =
      session?.status === "confirmed"
        ? "Entry has already been stamped into your ledger."
        : "Entry was already cancelled.";
    await answerCallbackQuery(queryId, statusMsg);
    return;
  }

  if (action === "confirm") {
    try {
      const commitResult = await commitParsedTransactions(
        session.uid,
        session.transactions,
        "telegram"
      );

      await sessionRef.update({
        status: "confirmed",
        confirmedAt: Timestamp.now(),
        transactionIds: commitResult.transactionIds,
      });

      await answerCallbackQuery(queryId, "✅ Stamped into ledger!");

      const symbol = "₹";
      const total = commitResult.totalAmount;
      const count = commitResult.count;

      const updatedText =
        `✅ <b>Stamped into Ledger!</b>\n\n` +
        `Recorded <b>${count}</b> ${count === 1 ? "entry" : "entries"} totaling <code>${symbol}${total}</code>.\n\n` +
        `<i>View the updated balances anytime on FinChat or ask me for your balance.</i>`;

      await editMessageText(chatId, messageId, updatedText, {
        replyMarkup: { inline_keyboard: [] },
      });
    } catch (commitErr: any) {
      console.error("Error committing Telegram transaction:", commitErr);
      await answerCallbackQuery(
        queryId,
        "Failed to save entry. Please try again.",
        true
      );
    }
  } else if (action === "cancel") {
    await sessionRef.update({
      status: "cancelled",
      cancelledAt: Timestamp.now(),
    });

    await answerCallbackQuery(queryId, "❌ Entry discarded.");

    await editMessageText(
      chatId,
      messageId,
      "❌ <b>Entry discarded.</b> No changes were written to your ledger.",
      { replyMarkup: { inline_keyboard: [] } }
    );
  }
}

/**
 * Handle Incoming Text Messages
 */
async function handleChatMessage(message: any) {
  const chatId = message.chat?.id;
  const text = message.text?.trim();
  const from = message.from;

  if (!chatId || !text) return;

  // Send immediate visual typing indicator so user knows bot is processing
  await sendChatAction(chatId, "typing");

  // 1. Handle /start account linking flow
  if (text.startsWith("/start")) {
    const parts = text.split(" ");
    const code = parts[1]?.trim().toUpperCase();

    if (code) {
      await handleLinkCodeSubmission(chatId, code, from);
      return;
    }

    // Bare /start command
    const linkDoc = await adminDb
      .collection("telegramLinks")
      .doc(String(chatId))
      .get();

    if (linkDoc.exists) {
      await sendTelegramMessage(
        chatId,
        `👋 <b>Welcome back!</b>\n\nYour account is connected to FinChat. Send any expense like <code>Spent 500 on lunch</code> or ask <code>What's my balance?</code>.`
      );
    } else {
      await sendTelegramMessage(
        chatId,
        `👋 <b>Welcome to FinChat!</b>\n\nTo link this Telegram bot to your FinChat account:\n1. Open the <b>FinChat web app</b>\n2. Go to <b>Settings → Connect Telegram</b>\n3. Tap the link to connect your account instantly.\n\n<i>Once connected, you can log expenses, track friend debts, and check balances right here!</i>`
      );
    }
    return;
  }

  // 2. Resolve chatId to uid
  const linkDoc = await adminDb
    .collection("telegramLinks")
    .doc(String(chatId))
    .get();

  if (!linkDoc.exists) {
    await sendTelegramMessage(
      chatId,
      `🔒 <b>Account Not Connected</b>\n\nPlease connect your Telegram account from the FinChat web app to start logging expenses:\n\n1. Open FinChat web app\n2. Go to <b>Settings → Connect Telegram</b>\n3. Tap the connection link`
    );
    return;
  }

  const uid = linkDoc.data()?.uid;
  if (!uid) return;

  // 3. Simple rate limiting per chat (max 20 messages per minute)
  const isRateLimited = await checkRateLimit(chatId);
  if (isRateLimited) {
    await sendTelegramMessage(
      chatId,
      "⏳ You're sending messages too fast — please wait a few seconds before trying again."
    );
    return;
  }

  // Keep sending typing status while processing complex requests
  await sendChatAction(chatId, "typing");

  // 4. Process incoming message through transport-agnostic core
  try {
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userCurrency = userDoc.data()?.currency || "INR";

    const result = await processIncomingMessage(uid, text, [], {
      currency: userCurrency,
    });

    if (result.intent === "off_topic") {
      await sendTelegramMessage(chatId, `ℹ️ ${escapeHtml(OFF_TOPIC_RESPONSE)}`);
      return;
    }

    if (result.intent === "status_query" && result.statusData) {
      const formattedStatus = formatTelegramStatusQuery(result.statusData, userCurrency);
      await sendTelegramMessage(chatId, formattedStatus);
      return;
    }

    if (result.intent === "log_transaction") {
      const transactions = result.transactions || [];

      // Check if clarification is needed
      const clarification = transactions.find((t) => t.needsClarification);
      if (clarification && clarification.clarificationQuestion) {
        await sendTelegramMessage(
          chatId,
          `❓ <b>Clarification Needed:</b>\n\n${escapeHtml(
            clarification.clarificationQuestion
          )}`
        );
        return;
      }

      if (transactions.length === 0) {
        await sendTelegramMessage(
          chatId,
          "I couldn't identify an amount or expense from your message. Please try something like <code>Spent 500 on groceries</code>."
        );
        return;
      }

      // Create short-lived confirmation session (30 minutes)
      const sessionId = crypto.randomBytes(8).toString("hex");
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await adminDb.collection("telegramSessions").doc(sessionId).set({
        id: sessionId,
        uid,
        chatId,
        transactions,
        status: "pending",
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(expiresAt),
      });

      const expenseMessage = formatTelegramExpenseMessage(transactions);
      const keyboard = getConfirmationKeyboard(sessionId);

      await sendTelegramMessage(chatId, expenseMessage, {
        replyMarkup: keyboard,
      });
    }
  } catch (err: any) {
    console.error("Error processing message for Telegram user:", err);
    await sendTelegramMessage(
      chatId,
      "Sorry, an unexpected error occurred while processing your message. Please try again."
    );
  }
}

/**
 * Handle Account Linking /start <code>
 */
async function handleLinkCodeSubmission(
  chatId: number | string,
  code: string,
  from: any
) {
  const codeRef = adminDb.collection("linkCodes").doc(code);
  const codeDoc = await codeRef.get();

  if (!codeDoc.exists) {
    await sendTelegramMessage(
      chatId,
      `❌ <b>Invalid Connection Code</b>\n\nThis link code does not exist. Please generate a new connection link from your FinChat Settings page.`
    );
    return;
  }

  const codeData = codeDoc.data();
  if (!codeData) {
    await sendTelegramMessage(
      chatId,
      `❌ <b>Invalid Connection Code</b>\n\nThis link code does not exist. Please generate a new connection link from your FinChat Settings page.`
    );
    return;
  }

  const now = Date.now();
  const expiresAt = codeData.expiresAt?.toMillis
    ? codeData.expiresAt.toMillis()
    : new Date(codeData.expiresAt || 0).getTime();

  if (codeData.used || now > expiresAt) {
    await sendTelegramMessage(
      chatId,
      `⌛ <b>Expired Link Code</b>\n\nThis connection code has expired or was already used. Please generate a fresh code from your FinChat Settings page.`
    );
    return;
  }

  const uid = codeData.uid;

  // 1. Mark code used
  await codeRef.update({ used: true, usedAt: Timestamp.now() });

  // 2. Link chatId to uid
  await adminDb
    .collection("telegramLinks")
    .doc(String(chatId))
    .set({
      uid,
      chatId,
      username: from?.username || null,
      firstName: from?.first_name || null,
      linkedAt: Timestamp.now(),
    });

  // 3. Update user profile reverse reference
  await adminDb
    .collection("users")
    .doc(uid)
    .update({ telegramChatId: chatId });

  await sendTelegramMessage(
    chatId,
    `✅ <b>Connected!</b>\n\nYour Telegram account is now linked to FinChat. You can now log expenses and ask about your balance right here.\n\nTry sending:\n• <code>Spent 500 on dinner</code>\n• <code>Bought groceries for 800, Sam owes 400</code>\n• <code>What is my current balance?</code>`
  );
}

/**
 * Basic rate limiting helper (max 20 msgs/minute per chat)
 */
async function checkRateLimit(chatId: number | string): Promise<boolean> {
  const rateLimitRef = adminDb
    .collection("telegramRateLimits")
    .doc(String(chatId));
  const doc = await rateLimitRef.get();
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;

  if (!doc.exists) {
    await rateLimitRef.set({ timestamps: [now] });
    return false;
  }

  const data = doc.data();
  const timestamps: number[] = (data?.timestamps || []).filter(
    (t: number) => t > oneMinuteAgo
  );

  if (timestamps.length >= 20) {
    return true; // Rate limited
  }

  timestamps.push(now);
  await rateLimitRef.set({ timestamps });
  return false;
}
