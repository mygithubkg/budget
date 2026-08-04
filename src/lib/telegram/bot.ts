import { ParsedExpenseData } from "@/lib/validations";
import { StatusQueryResult, ParsedExpense } from "@/types";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

export interface SendMessageOptions {
  parseMode?: "HTML" | "MarkdownV2";
  replyMarkup?: any;
  disableWebPagePreview?: boolean;
}

/**
 * Sends a message via Telegram Bot API
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: SendMessageOptions
): Promise<any> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not configured. Skipping sendTelegramMessage.");
    return null;
  }

  const payload: any = {
    chat_id: chatId,
    text,
    parse_mode: options?.parseMode ?? "HTML",
    disable_web_page_preview: options?.disableWebPagePreview ?? true,
  };

  if (options?.replyMarkup) {
    payload.reply_markup = options.replyMarkup;
  }

  const res = await fetch(`${TELEGRAM_API_BASE}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Telegram sendMessage error:", data);
  }
  return data;
}

/**
 * Edits an existing message in a Telegram chat
 */
export async function editMessageText(
  chatId: string | number,
  messageId: number,
  text: string,
  options?: SendMessageOptions
): Promise<any> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  const payload: any = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: options?.parseMode ?? "HTML",
    disable_web_page_preview: options?.disableWebPagePreview ?? true,
  };

  if (options?.replyMarkup) {
    payload.reply_markup = options.replyMarkup;
  }

  const res = await fetch(`${TELEGRAM_API_BASE}${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return await res.json();
}

/**
 * Answers a Telegram callback query from an inline keyboard button tap
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<any> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  const payload: any = {
    callback_query_id: callbackQueryId,
    show_alert: showAlert,
  };
  if (text) payload.text = text;

  const res = await fetch(`${TELEGRAM_API_BASE}${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return await res.json();
}

/**
 * Sends a chat action (like 'typing...') to give visual feedback to the user
 */
export async function sendChatAction(
  chatId: string | number,
  action: "typing" | "upload_document" | "choose_sticker" = "typing"
): Promise<any> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}${token}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        action,
      }),
    });
    return await res.json();
  } catch (err) {
    // Non-blocking
    return null;
  }
}

/**
 * Registers the Telegram webhook with secret token verification
 */
export async function setTelegramWebhook(
  webhookUrl: string,
  secretToken?: string
): Promise<any> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is required to register webhook.");

  const payload: any = {
    url: webhookUrl,
    allowed_updates: ["message", "callback_query"],
  };
  if (secretToken) {
    payload.secret_token = secretToken;
  }

  const res = await fetch(`${TELEGRAM_API_BASE}${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return await res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatters & UI Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getCurrencySymbol(currency: string = "INR"): string {
  if (currency === "USD") return "$";
  if (currency === "EUR") return "€";
  if (currency === "GBP") return "£";
  return "₹";
}

/**
 * Formats a single or multi-expense breakdown in monospace HTML <pre> table
 */
export function formatTelegramExpenseMessage(
  transactions: (ParsedExpense | ParsedExpenseData)[],
  currency: string = "INR"
): string {
  const symbol = getCurrencySymbol(currency);
  const total = transactions.reduce((acc, t) => acc + (t.totalAmount || 0), 0);

  let output = `<b>📒 Logged from your message:</b>\n\n<pre>`;

  // Calculate width for alignment
  transactions.forEach((t) => {
    const amtStr = `${symbol}${t.totalAmount}`.padEnd(8, " ");
    const desc = t.description || "Expense";
    const cat = t.category ? ` (${t.category})` : "";
    output += `${amtStr} ${desc}${cat}\n`;

    if (t.splits && t.splits.length > 0) {
      t.splits.forEach((s) => {
        const splitTag =
          s.direction === "i_owe_them"
            ? `  └ owe ${s.friendName}: ${symbol}${s.amount}`
            : `  └ ${s.friendName} owes: ${symbol}${s.amount}`;
        output += `${splitTag}\n`;
      });
    }
  });

  output += `─────────────────────────\n`;
  output += `${`${symbol}${total}`.padEnd(8, " ")} Total\n`;
  output += `</pre>`;

  return output;
}

/**
 * Generates inline keyboard for Confirm / Cancel actions
 */
export function getConfirmationKeyboard(sessionId: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Confirm", callback_data: `confirm:${sessionId}` },
        { text: "❌ Cancel", callback_data: `cancel:${sessionId}` },
      ],
    ],
  };
}

function formatAmt(val: number, symbol: string): string {
  const isNeg = val < 0;
  const abs = Math.abs(val);
  const formatted = abs.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(abs) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${isNeg ? "-" : ""}${symbol}${formatted}`;
}

/**
 * Formats status query results into rich Telegram HTML
 */
export function formatTelegramStatusQuery(
  statusData: StatusQueryResult,
  currency: string = "INR"
): string {
  const symbol = getCurrencySymbol(currency);

  if (statusData.queryType === "balance") {
    const bal = statusData.balance ?? 0;
    const formattedBal = formatAmt(bal, symbol);
    const formattedIncome = formatAmt(statusData.totalIncome ?? 0, symbol);
    const formattedExpense = formatAmt(statusData.totalExpense ?? 0, symbol);

    return `💰 <b>Current Ledger Net Balance:</b> <code>${formattedBal}</code>\n\n` +
      `• Total Income: <code>+${formattedIncome}</code>\n` +
      `• Total Expenses: <code>-${formattedExpense}</code>`;
  }

  if (statusData.queryType === "last_transactions") {
    const txs = statusData.transactions || [];
    if (txs.length === 0) {
      return `📒 <b>Recent Ledger Entries:</b>\n\n<i>No entries have been recorded yet.</i>`;
    }

    let msg = `<b>📒 Most Recent Ledger Entries:</b>\n\n<pre>`;
    txs.forEach((t) => {
      const sign = t.type === "income" ? "+" : "-";
      const amtFormatted = `${sign}${symbol}${Math.abs(t.amount)}`;
      const amtStr = amtFormatted.padEnd(9, " ");
      const desc = t.description.length > 14 ? t.description.slice(0, 13) + "…" : t.description;
      msg += `${t.date.slice(5)} ${amtStr} ${desc}\n`;
    });
    msg += `</pre>`;
    return msg;
  }

  if (statusData.queryType === "friend_debts") {
    const debts = statusData.friendDebts || [];
    if (debts.length === 0) {
      return `🤝 <b>Friend Debts Register:</b>\n\n<i>No outstanding balances with friends. All accounts are settled!</i>`;
    }

    let msg = `🤝 <b>Friend Debts Register:</b>\n\n`;
    debts.forEach((f) => {
      if (f.balance > 0) {
        msg += `✅ <b>${escapeHtml(f.friendName)}</b> owes you <code>${symbol}${f.balance.toLocaleString("en-IN")}</code>\n`;
      } else {
        msg += `🔴 You owe <b>${escapeHtml(f.friendName)}</b> <code>${symbol}${Math.abs(f.balance).toLocaleString("en-IN")}</code>\n`;
      }
    });
    return msg;
  }

  // general_summary
  const bal = statusData.balance ?? 0;
  let summary = `📊 <b>Ledger Account Overview</b>\n\n`;
  summary += `💰 Net Balance: <code>${formatAmt(bal, symbol)}</code>\n`;

  if (statusData.transactions && statusData.transactions.length > 0) {
    summary += `\n<b>Recent Activity:</b>\n`;
    statusData.transactions.forEach((t) => {
      summary += `• ${escapeHtml(t.description)}: <code>${symbol}${t.amount}</code> (${escapeHtml(t.category)})\n`;
    });
  }

  if (statusData.friendDebts && statusData.friendDebts.length > 0) {
    summary += `\n<b>Friend Balances:</b>\n`;
    statusData.friendDebts.forEach((f) => {
      const label = f.balance > 0 ? `owes you ${symbol}${f.balance}` : `you owe ${symbol}${Math.abs(f.balance)}`;
      summary += `• ${escapeHtml(f.friendName)}: <i>${label}</i>\n`;
    });
  }

  return summary;
}

/**
 * Escapes HTML characters for Telegram parse_mode: HTML
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
