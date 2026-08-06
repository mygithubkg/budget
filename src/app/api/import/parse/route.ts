import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  extractSpreadsheetGrid,
  extractDocxTables,
  parseTabularData,
} from "@/lib/import/tabular-parser";
import { parseFreeformDocx } from "@/lib/import/freeform-parser";
import { detectDuplicates } from "@/lib/import/duplicate-detector";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { BYOKError } from "@/lib/ai/aiProvider";
import { ImportParseResult, ImportPreviewItem } from "@/types";

export const dynamic = "force-dynamic";

// Maximum upload limit: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = req.headers.get("authorization");
    let uid = "anonymous-user";

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1];
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        uid = decoded.uid;
      } catch (authErr) {
        console.warn("Auth token verification failed:", authErr);
      }
    }

    // 2. Parse Multipart Form
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds maximum size limit of 10MB" },
        { status: 400 }
      );
    }

    const fileName = file.name || "statement.xlsx";
    const extension = fileName.split(".").pop()?.toLowerCase() || "";

    if (!["xlsx", "xls", "csv", "docx"].includes(extension)) {
      return NextResponse.json(
        {
          error:
            "Unsupported file format. Please upload an Excel file (.xlsx, .xls), CSV (.csv), or Word document (.docx).",
        },
        { status: 400 }
      );
    }

    // Convert file to in-memory Buffer (no disk persistence)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Fetch user categories, friends, and existing transactions from Firestore
    let categoryList = DEFAULT_CATEGORIES;
    let friendList: string[] = [];
    let currency = "INR";
    const existingTransactions: any[] = [];

    try {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data?.currency) currency = data.currency;
      }

      // User categories
      const catSnap = await adminDb
        .collection("users")
        .doc(uid)
        .collection("categories")
        .get();
      if (!catSnap.empty) {
        categoryList = catSnap.docs.map((d) => d.data().name);
      }

      // User friends
      const friendSnap = await adminDb
        .collection("users")
        .doc(uid)
        .collection("friends")
        .get();
      if (!friendSnap.empty) {
        friendList = friendSnap.docs.map((d) => d.data().name);
      }

      // User existing transactions for duplicate detection
      const txSnap = await adminDb
        .collection("users")
        .doc(uid)
        .collection("transactions")
        .orderBy("date", "desc")
        .limit(1000)
        .get();

      if (!txSnap.empty) {
        txSnap.docs.forEach((doc) => {
          const d = doc.data();
          existingTransactions.push({
            id: doc.id,
            amount: d.amount || 0,
            type: d.type || "expense",
            date: d.date?.toDate ? d.date.toDate() : d.date,
            description: d.description || "",
          });
        });
      }
    } catch (dbErr) {
      console.warn("Could not load user metadata for import:", dbErr);
    }

    // 4. Determine Extraction Path
    let rawItems: ImportPreviewItem[] = [];
    let pathType: "tabular" | "freeform" = "tabular";

    if (extension === "docx") {
      // Check if docx contains tabular data
      const docxTables = await extractDocxTables(buffer);
      if (docxTables && docxTables.length > 0) {
        pathType = "tabular";
        rawItems = await parseTabularData(uid, docxTables, categoryList);
      } else {
        // Fallback to free-form prose NLP parsing
        pathType = "freeform";
        rawItems = await parseFreeformDocx(uid, buffer, {
          categoryList,
          friendList,
        });
      }
    } else {
      // Spreadsheets (.xlsx, .xls, .csv)
      pathType = "tabular";
      const gridRows = extractSpreadsheetGrid(buffer);
      if (gridRows.length === 0) {
        return NextResponse.json(
          {
            error:
              "No readable rows or transaction data could be extracted from this spreadsheet.",
          },
          { status: 422 }
        );
      }
      rawItems = await parseTabularData(uid, gridRows, categoryList);
    }

    if (rawItems.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid transactions could be identified in the uploaded document. Please check the file formatting.",
        },
        { status: 422 }
      );
    }

    // 5. Run Duplicate Detection against user's existing Firestore records
    const finalItems = detectDuplicates(rawItems, existingTransactions, currency);
    const duplicatesCount = finalItems.filter((i) => i.isDuplicate).length;

    const result: ImportParseResult = {
      success: true,
      fileName,
      fileType: extension as any,
      pathType,
      totalRowsFound: finalItems.length,
      duplicatesCount,
      items: finalItems,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in /api/import/parse:", error);
    if (error instanceof BYOKError) {
      return NextResponse.json(
        { error: error.userFriendlyMessage, isBYOK: true },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to process import file" },
      { status: 500 }
    );
  }
}
