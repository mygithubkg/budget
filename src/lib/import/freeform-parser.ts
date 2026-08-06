import mammoth from "mammoth";
import { processIncomingMessage } from "@/lib/chat/processMessage";
import { ImportPreviewItem } from "@/types";
import { format } from "date-fns";

/**
 * Splits prose text into paragraphs or logical sections suitable for context size.
 */
function chunkProseText(text: string, maxChunkLength: number = 1000): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxChunkLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n${para}` : para;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  // If there are no double-newline paragraphs, split by single lines
  if (chunks.length === 0 && text.trim().length > 0) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    let lineChunk = "";
    for (const line of lines) {
      if (lineChunk.length + line.length > maxChunkLength && lineChunk.length > 0) {
        chunks.push(lineChunk.trim());
        lineChunk = line;
      } else {
        lineChunk = lineChunk ? `${lineChunk}\n${line}` : line;
      }
    }
    if (lineChunk.trim()) {
      chunks.push(lineChunk.trim());
    }
  }

  return chunks;
}

/**
 * Path B: Free-form text extraction for Word prose / expense diaries.
 * 1. Extracts raw text via mammoth.
 * 2. Chunks paragraphs.
 * 3. Runs chunks through processIncomingMessage (same NLP multi-expense pipeline used for chat).
 */
export async function parseFreeformDocx(
  uid: string,
  buffer: Buffer,
  options: {
    categoryList?: string[];
    friendList?: string[];
    todayDate?: string;
  } = {}
): Promise<ImportPreviewItem[]> {
  const result = await mammoth.extractRawText({ buffer });
  const rawText = result.value || "";

  if (!rawText.trim()) return [];

  const chunks = chunkProseText(rawText);
  const items: ImportPreviewItem[] = [];
  const todayStr = options.todayDate || format(new Date(), "yyyy-MM-dd");

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk.trim()) continue;

    try {
      const chatRes = await processIncomingMessage(uid, chunk, [], {
        categoryList: options.categoryList,
        friendList: options.friendList,
        todayDate: todayStr,
      });

      if (chatRes.transactions && chatRes.transactions.length > 0) {
        chatRes.transactions.forEach((tx, idx) => {
          items.push({
            tempId: `imp_ff_${Date.now()}_${i}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
            date: tx.date || todayStr,
            description: tx.description || "Prose transaction",
            category: tx.category || "General",
            amount: tx.totalAmount || tx.userShare || 0,
            type: tx.type === "income" ? "income" : "expense",
            userShare: tx.userShare || tx.totalAmount || 0,
            isDuplicate: false,
            selected: true,
            splits: tx.splits || [],
          });
        });
      }
    } catch (err) {
      console.warn(`Error parsing free-form chunk ${i}:`, err);
    }
  }

  return items;
}
