import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { parse, isValid, format } from "date-fns";
import { getRawAICompletion, cleanAndParseJSON } from "@/lib/ai/aiProvider";
import { findSimilarCategory } from "@/lib/category-utils";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { ImportPreviewItem, TabularColumnMapping } from "@/types";

/**
 * Parses numeric strings with commas, currency symbols, or accounting parenthesis.
 * e.g. "$1,234.50" -> 1234.50, "(45.00)" -> -45.00, "1 200,50" -> 1200.50
 */
export function parseCleanNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return isNaN(value) ? null : value;

  let str = String(value).trim();
  if (!str) return null;

  // Handle accounting format (123.45) as negative
  let isNegative = false;
  if (str.startsWith("(") && str.endsWith(")")) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith("-")) {
    isNegative = true;
    str = str.slice(1).trim();
  } else if (str.endsWith("-")) {
    isNegative = true;
    str = str.slice(0, -1).trim();
  }

  // Remove currency symbols, non-breaking spaces, and letters (e.g. INR, USD, Rs)
  str = str.replace(/[^0-9.,]/g, "").trim();
  if (!str) return null;

  // Handle European number formats (1.234,56 vs 1,234.56)
  if (str.includes(",") && str.includes(".")) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      // 1.234,56 -> replace . with '' and , with .
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,234.56 -> remove commas
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(",")) {
    // Only comma: check if comma is decimal separator (e.g. 12,50) or thousands separator (1,200)
    const parts = str.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      str = str.replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  }

  const num = parseFloat(str);
  if (isNaN(num)) return null;
  return isNegative ? -Math.abs(num) : num;
}

/**
 * Deterministically parses a date value into an ISO yyyy-MM-dd string.
 * Supports Excel serial dates, standard ISO, and common bank statement formats.
 */
export function parseCleanDate(value: any, preferredFormat?: string | null): string {
  if (!value) return format(new Date(), "yyyy-MM-dd");

  // Excel serial number (e.g. 45123)
  if (typeof value === "number" || (!isNaN(Number(value)) && Number(value) > 20000 && Number(value) < 80000)) {
    const serial = Number(value);
    // Excel epoch: Dec 30, 1899
    const utcDays = Math.floor(serial - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    if (isValid(date)) {
      return format(date, "yyyy-MM-dd");
    }
  }

  if (value instanceof Date) {
    if (isValid(value)) return format(value, "yyyy-MM-dd");
  }

  const dateStr = String(value).trim();
  if (!dateStr) return format(new Date(), "yyyy-MM-dd");

  // Direct ISO check (yyyy-MM-dd or yyyy-MM-ddTHH:mm:ss)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const isoDate = new Date(dateStr.slice(0, 10));
    if (isValid(isoDate)) return format(isoDate, "yyyy-MM-dd");
  }

  const cleanStr = dateStr.split(" ")[0].trim(); // take date part if timestamp included

  // Candidate format patterns
  const candidateFormats = [
    preferredFormat,
    "dd/MM/yyyy",
    "dd-MM-yyyy",
    "dd.MM.yyyy",
    "MM/dd/yyyy",
    "MM-dd-yyyy",
    "yyyy/MM/dd",
    "yyyy.MM.dd",
    "d/M/yyyy",
    "d-M-yyyy",
    "dd-MMM-yyyy",
    "dd MMM yyyy",
    "d MMM yyyy",
    "MMM dd, yyyy",
    "MMM d, yyyy",
    "dd-MMM-yy",
    "dd/MM/yy",
    "MM/dd/yy",
  ].filter(Boolean) as string[];

  const referenceDate = new Date();

  for (const fmt of candidateFormats) {
    try {
      const parsed = parse(cleanStr, fmt, referenceDate);
      if (isValid(parsed) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
        return format(parsed, "yyyy-MM-dd");
      }
    } catch {
      // try next format
    }
  }

  // Fallback native Date parse
  const fallback = new Date(dateStr);
  if (isValid(fallback) && fallback.getFullYear() > 1990 && fallback.getFullYear() < 2100) {
    return format(fallback, "yyyy-MM-dd");
  }

  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Extracts raw table rows from a Word document (.docx) HTML output.
 */
export async function extractDocxTables(buffer: Buffer): Promise<Array<Record<string, string>> | null> {
  try {
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;

    if (!html.includes("<table")) {
      return null;
    }

    // Simple table parser for HTML output from mammoth
    const tableMatches = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi);
    if (!tableMatches || tableMatches.length === 0) return null;

    const rows: Array<Record<string, string>> = [];

    for (const tableHtml of tableMatches) {
      const rowMatches = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      if (!rowMatches || rowMatches.length < 2) continue;

      // Extract headers from first row
      const headerRow = rowMatches[0];
      const headerCols = Array.from(headerRow.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)).map((m) =>
        m[1].replace(/<[^>]+>/g, "").trim()
      );

      if (headerCols.length < 2) continue;

      // Extract data rows
      for (let i = 1; i < rowMatches.length; i++) {
        const trHtml = rowMatches[i];
        const colMatches = Array.from(trHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) =>
          m[1].replace(/<[^>]+>/g, "").trim()
        );

        if (colMatches.length === 0) continue;

        const rowObj: Record<string, string> = {};
        headerCols.forEach((header, idx) => {
          rowObj[header || `col_${idx}`] = colMatches[idx] || "";
        });

        // Ensure row isn't completely empty
        const hasContent = Object.values(rowObj).some((val) => val.length > 0);
        if (hasContent) {
          rows.push(rowObj);
        }
      }
    }

    return rows.length > 0 ? rows : null;
  } catch (err) {
    console.warn("Could not extract docx tables:", err);
    return null;
  }
}

/**
 * Extracts raw grid from spreadsheet (.xlsx, .xls, .csv).
 */
export function extractSpreadsheetGrid(buffer: Buffer): Array<Record<string, any>> {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: false,
    raw: false,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return [];

  // Convert to 2D array first to locate the header row if top rows contain bank metadata
  const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (rawRows.length === 0) return [];

  // Find the most probable header row
  let headerIndex = 0;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;
    const rowText = row.map((c) => String(c).toLowerCase()).join(" ");

    // If row contains common transaction header keywords
    if (
      (rowText.includes("date") || rowText.includes("txn") || rowText.includes("time")) &&
      (rowText.includes("desc") || rowText.includes("particular") || rowText.includes("narration") || rowText.includes("detail") || rowText.includes("memo") || rowText.includes("amount") || rowText.includes("debit") || rowText.includes("withdrawal"))
    ) {
      headerIndex = i;
      break;
    }
  }

  // Convert using the detected header row
  const headers = (rawRows[headerIndex] as any[]).map((h, idx) =>
    String(h || "").trim() ? String(h).trim() : `Column_${idx + 1}`
  );

  const resultRows: Array<Record<string, any>> = [];

  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i] as any[];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rowObj: Record<string, any> = {};
    let hasValue = false;

    headers.forEach((header, idx) => {
      const val = row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : "";
      rowObj[header] = val;
      if (val) hasValue = true;
    });

    if (hasValue) {
      resultRows.push(rowObj);
    }
  }

  return resultRows;
}

/**
 * Single AI call to detect column schema from header + sample rows.
 */
export async function detectColumnSchemaWithAI(
  uid: string,
  sampleRows: Array<Record<string, any>>
): Promise<TabularColumnMapping> {
  if (sampleRows.length === 0) {
    return {
      dateColumn: null,
      descriptionColumn: null,
      amountColumns: { debit: null, credit: null, signedAmount: null },
      ignoreColumns: [],
    };
  }

  const columns = Object.keys(sampleRows[0]);
  const previewData = sampleRows.slice(0, 8);

  const systemPrompt = `You are a financial data schema inference engine.
Given a list of column names and sample rows from an uploaded bank statement or expense spreadsheet, infer the semantic role of each column.

Return ONLY a valid JSON object matching this schema:
{
  "dateColumn": string | null,
  "dateFormat": string | null, // e.g. "dd/MM/yyyy", "yyyy-MM-dd", "MM/dd/yyyy", "dd-MMM-yyyy"
  "descriptionColumn": string | null,
  "amountColumns": {
    "debit": string | null, // column for expenses/withdrawals (if split into debit/credit)
    "credit": string | null, // column for income/deposits (if split into debit/credit)
    "signedAmount": string | null // column for combined amount (positive=income, negative=expense, or single transaction amount)
  },
  "ignoreColumns": string[] // e.g. running balance, check number, transaction ID, reference number
}`;

  const userPrompt = `Columns found: ${JSON.stringify(columns)}

Sample data rows (first ${previewData.length}):
${JSON.stringify(previewData, null, 2)}

Identify the exact column names for date, description, and amount.`;

  try {
    const aiResult = await getRawAICompletion(uid, systemPrompt, userPrompt);
    const parsed = cleanAndParseJSON(aiResult.content);

    return {
      dateColumn: parsed.dateColumn || columns.find((c) => /date|txn.*date|time/i.test(c)) || null,
      dateFormat: parsed.dateFormat || null,
      descriptionColumn:
        parsed.descriptionColumn ||
        columns.find((c) => /desc|particular|narration|memo|detail|remarks/i.test(c)) ||
        null,
      amountColumns: {
        debit: parsed.amountColumns?.debit || columns.find((c) => /debit|withdrawal|spent|dr/i.test(c)) || null,
        credit: parsed.amountColumns?.credit || columns.find((c) => /credit|deposit|income|cr/i.test(c)) || null,
        signedAmount:
          parsed.amountColumns?.signedAmount ||
          (!parsed.amountColumns?.debit && !parsed.amountColumns?.credit
            ? columns.find((c) => /amount|total|sum/i.test(c)) || null
            : null),
      },
      ignoreColumns: Array.isArray(parsed.ignoreColumns) ? parsed.ignoreColumns : [],
    };
  } catch (err) {
    console.warn("AI Column detection failed, using heuristic fallback:", err);
    // Heuristic column detection fallback
    return {
      dateColumn: columns.find((c) => /date|txn.*date|time/i.test(c)) || columns[0] || null,
      dateFormat: null,
      descriptionColumn: columns.find((c) => /desc|particular|narration|memo|detail|remarks/i.test(c)) || columns[1] || null,
      amountColumns: {
        debit: columns.find((c) => /debit|withdrawal|dr/i.test(c)) || null,
        credit: columns.find((c) => /credit|deposit|cr/i.test(c)) || null,
        signedAmount: columns.find((c) => /amount|total/i.test(c)) || null,
      },
      ignoreColumns: columns.filter((c) => /balance|ref|chq|id/i.test(c)),
    };
  }
}

/**
 * Batched AI categorization: categorizes descriptions in batches of 30-40.
 */
export async function batchCategorizeDescriptions(
  uid: string,
  descriptions: string[],
  categoryList: string[] = DEFAULT_CATEGORIES
): Promise<Record<string, string>> {
  const uniqueDescriptions = Array.from(new Set(descriptions.map((d) => d.trim()).filter(Boolean)));
  const categoryMap: Record<string, string> = {};

  if (uniqueDescriptions.length === 0) return categoryMap;

  // Process in batches of 35
  const BATCH_SIZE = 35;
  for (let i = 0; i < uniqueDescriptions.length; i += BATCH_SIZE) {
    const batch = uniqueDescriptions.slice(i, i + BATCH_SIZE);

    const systemPrompt = `You are a financial transaction categorizer.
Available user categories: ${JSON.stringify(categoryList)}

For each description in the list, choose the most appropriate category from the user's categories list, or suggest a clear 1-2 word standard category name if none fit (e.g. "Food & Dining", "Groceries", "Transport", "Utilities", "Shopping", "Entertainment", "Healthcare", "Salary", "Investment", "Transfer", "General").

Return ONLY a JSON object mapping each exact description to its chosen category:
{
  "Description 1": "Food & Dining",
  "Description 2": "Transport"
}`;

    const userPrompt = JSON.stringify(batch);

    try {
      const aiResult = await getRawAICompletion(uid, systemPrompt, userPrompt);
      const parsed = cleanAndParseJSON(aiResult.content);

      if (parsed && typeof parsed === "object") {
        for (const [desc, rawCat] of Object.entries(parsed)) {
          if (typeof rawCat === "string") {
            const matched = findSimilarCategory(rawCat, categoryList);
            categoryMap[desc] = matched.resolvedName;
          }
        }
      }
    } catch (err) {
      console.warn("Batch categorization failed for batch, applying fallback:", err);
      for (const desc of batch) {
        categoryMap[desc] = findSimilarCategory(desc, categoryList).resolvedName || "General";
      }
    }
  }

  return categoryMap;
}

/**
 * Full Tabular Extraction Pipeline:
 * 1. Reads grid from Excel or Word table.
 * 2. Runs AI column schema detection on sample.
 * 3. Extracts rows deterministically (dates, amounts, debits/credits).
 * 4. Categorizes descriptions in batches.
 */
export async function parseTabularData(
  uid: string,
  rawRows: Array<Record<string, any>>,
  categoryList: string[] = DEFAULT_CATEGORIES
): Promise<ImportPreviewItem[]> {
  if (!rawRows || rawRows.length === 0) return [];

  // 1. Detect column schema
  const schema = await detectColumnSchemaWithAI(uid, rawRows.slice(0, 10));

  const { dateColumn, dateFormat, descriptionColumn, amountColumns } = schema;

  // 2. Deterministic Row Processing
  const preliminaryItems: Array<{
    tempId: string;
    date: string;
    description: string;
    amount: number;
    type: "expense" | "income";
    userShare: number;
    rawRow: Record<string, any>;
  }> = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];

    // Extract Description
    let desc = "";
    if (descriptionColumn && row[descriptionColumn] !== undefined) {
      desc = String(row[descriptionColumn]).trim();
    } else {
      // Concatenate non-date, non-amount columns as fallback
      const otherVals = Object.entries(row)
        .filter(([k, v]) => k !== dateColumn && !schema.ignoreColumns.includes(k) && v)
        .map(([_, v]) => String(v).trim());
      desc = otherVals.join(" - ");
    }

    if (!desc) desc = "Bank Transaction";

    // Extract Date
    const rawDateVal = dateColumn ? row[dateColumn] : null;
    const parsedDate = parseCleanDate(rawDateVal, dateFormat);

    // Extract Amount & Type
    let amount = 0;
    let type: "expense" | "income" = "expense";

    const debitVal = amountColumns.debit ? parseCleanNumber(row[amountColumns.debit]) : null;
    const creditVal = amountColumns.credit ? parseCleanNumber(row[amountColumns.credit]) : null;
    const signedVal = amountColumns.signedAmount ? parseCleanNumber(row[amountColumns.signedAmount]) : null;

    if (debitVal !== null && debitVal > 0) {
      amount = Math.abs(debitVal);
      type = "expense";
    } else if (creditVal !== null && creditVal > 0) {
      amount = Math.abs(creditVal);
      type = "income";
    } else if (signedVal !== null && signedVal !== 0) {
      if (signedVal < 0) {
        amount = Math.abs(signedVal);
        type = "expense";
      } else {
        amount = signedVal;
        type = "income";
      }
    } else {
      // Row might be a summary row (e.g. Total, Opening Balance) or invalid
      continue;
    }

    if (amount <= 0) continue;

    preliminaryItems.push({
      tempId: `imp_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
      date: parsedDate,
      description: desc,
      amount,
      type,
      userShare: amount,
      rawRow: row,
    });
  }

  if (preliminaryItems.length === 0) return [];

  // 3. Batched AI Categorization
  const allDescriptions = preliminaryItems.map((item) => item.description);
  const categoryMap = await batchCategorizeDescriptions(uid, allDescriptions, categoryList);

  // 4. Construct Final Preview Items
  return preliminaryItems.map((item) => {
    const assignedCat = categoryMap[item.description] || findSimilarCategory(item.description, categoryList).resolvedName || "General";

    return {
      ...item,
      category: assignedCat,
      isDuplicate: false,
      selected: true,
      splits: [],
    };
  });
}
