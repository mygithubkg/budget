import Papa from "papaparse";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ExportRowRaw,
  PreparedExportData,
  formatCurrency,
} from "./exportData";

/**
 * Universal in-memory client-side download trigger
 */
export function downloadBlob(
  content: string | ArrayBuffer | Blob,
  filename: string,
  mimeType: string
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download CSV export
 */
export function exportToCSV(
  rows: ExportRowRaw[],
  fromDateStr: string,
  toDateStr: string
): void {
  const formattedRows = rows.map((r) => ({
    "Date": r.date,
    "Type": r.type,
    "Description": r.description,
    "Category": r.category,
    "Total Amount": r.totalAmount,
    "Your Share": r.userShare,
    "Split With": r.splitWith,
    "Running Balance": r.runningBalance,
    "Source": r.source,
  }));

  const csv = Papa.unparse(formattedRows);
  // Add UTF-8 BOM (\uFEFF) to ensure Excel / third-party viewers render special characters cleanly
  downloadBlob(
    "\uFEFF" + csv,
    `finchat-transactions-${fromDateStr}-to-${toDateStr}.csv`,
    "text/csv;charset=utf-8;"
  );
}

/**
 * Generate and download Excel (.xlsx) export
 */
export function exportToExcel(
  rows: ExportRowRaw[],
  fromDateStr: string,
  toDateStr: string
): void {
  const formattedRows = rows.map((r) => ({
    "Date": r.date,
    "Type": r.type,
    "Description": r.description,
    "Category": r.category,
    "Total Amount": r.totalAmount,
    "Your Share": r.userShare,
    "Split With": r.splitWith,
    "Running Balance": r.runningBalance,
    "Source": r.source,
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedRows);

  // Set explicit clean column widths
  worksheet["!cols"] = [
    { wch: 12 }, // Date
    { wch: 10 }, // Type
    { wch: 28 }, // Description
    { wch: 16 }, // Category
    { wch: 14 }, // Total Amount
    { wch: 14 }, // Your Share
    { wch: 24 }, // Split With
    { wch: 16 }, // Running Balance
    { wch: 10 }, // Source
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  downloadBlob(
    excelBuffer,
    `finchat-transactions-${fromDateStr}-to-${toDateStr}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

/**
 * Generate and download Landscape PDF Statement styled with Ledger theme
 */
export function exportToPDF(data: PreparedExportData): void {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const { pdfRows, summary, fromDateStr, toDateStr, pdfCurrencySymbol } = data;
  const pdfSym = pdfCurrencySymbol || "Rs. ";

  // Ledger color palette
  const RULE_RED: [number, number, number] = [162, 59, 46]; // #A23B2E
  const INK_DARK: [number, number, number] = [26, 29, 36]; // #1A1D24
  const MUTED_INK: [number, number, number] = [110, 115, 128]; // #6E7380
  const FIBER_LINE: [number, number, number] = [228, 222, 206]; // #E4DECE
  const PAPER_LIGHT: [number, number, number] = [246, 243, 231]; // #F6F3E7
  const STAMP_INDIGO: [number, number, number] = [43, 84, 126]; // #2B547E

  // 1. Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...RULE_RED);
  doc.text("FINCHAT", 40, 36);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED_INK);
  doc.text("Ruled Account Register — Transaction Statement", 120, 36);

  // Statement Metadata
  doc.setFontSize(8.5);
  doc.setTextColor(...INK_DARK);
  doc.text(`Statement Period: ${fromDateStr}  to  ${toDateStr}`, 40, 52);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })}`,
    670,
    52
  );

  // Horizontal ruled dividing line
  doc.setDrawColor(...FIBER_LINE);
  doc.setLineWidth(1);
  doc.line(40, 58, 801.89, 58);

  // 2. Structured 5-Column Summary Banner Box
  const boxX = 40;
  const boxY = 66;
  const boxWidth = 761.89;
  const boxHeight = 38;
  const colWidth = boxWidth / 5; // ~152.37 pt per card

  doc.setFillColor(...PAPER_LIGHT);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, "F");
  doc.setDrawColor(...FIBER_LINE);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, "S");

  // Metric values
  const opBal = formatCurrency(summary.openingBalance, pdfSym, true);
  const inc = `+${formatCurrency(summary.totalIncome, pdfSym)}`;
  const exp = `-${formatCurrency(summary.totalExpense, pdfSym)}`;
  const net = formatCurrency(summary.netChange, pdfSym, true);
  const clBal = formatCurrency(summary.closingBalance, pdfSym, true);

  const metrics = [
    { label: "OPENING BALANCE", value: opBal, color: INK_DARK },
    { label: "TOTAL INCOME", value: inc, color: [34, 139, 34] as [number, number, number] },
    { label: "TOTAL EXPENSES", value: exp, color: RULE_RED },
    {
      label: "NET CHANGE",
      value: net,
      color: (summary.netChange >= 0 ? [34, 139, 34] : RULE_RED) as [number, number, number],
    },
    { label: "CLOSING BALANCE", value: clBal, color: STAMP_INDIGO },
  ];

  metrics.forEach((m, idx) => {
    const colStartX = boxX + idx * colWidth;

    // Draw vertical column divider (except first)
    if (idx > 0) {
      doc.setDrawColor(...FIBER_LINE);
      doc.line(colStartX, boxY + 5, colStartX, boxY + boxHeight - 5);
    }

    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED_INK);
    doc.text(m.label, colStartX + 12, boxY + 14);

    // Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...m.color);
    doc.text(m.value, colStartX + 12, boxY + 28);
  });

  // 3. Transactions Table (761 pt total width)
  const tableHead = [
    [
      "Date",
      "Type",
      "Description",
      "Category",
      "Total Amount",
      "Your Share",
      "Split With",
      "Running Balance",
      "Source",
    ],
  ];

  const tableBody = pdfRows.map((r) => [
    r.date,
    r.type,
    r.description,
    r.category,
    r.totalAmount,
    r.userShare,
    r.splitWith || "—",
    r.runningBalance,
    r.source,
  ]);

  autoTable(doc, {
    startY: 114,
    head: tableHead,
    body: tableBody,
    theme: "plain",
    tableWidth: 761.89,
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 4,
      textColor: INK_DARK,
      lineColor: FIBER_LINE,
      lineWidth: 0.5,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: RULE_RED,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
      cellPadding: 5,
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: PAPER_LIGHT,
    },
    columnStyles: {
      0: { cellWidth: 60 }, // Date
      1: { cellWidth: 44 }, // Type
      2: { cellWidth: 186 }, // Description
      3: { cellWidth: 80 }, // Category
      4: { cellWidth: 70, halign: "right", font: "courier" }, // Total Amount
      5: { cellWidth: 70, halign: "right", font: "courier" }, // Your Share
      6: { cellWidth: 110 }, // Split With
      7: { cellWidth: 95, halign: "right", font: "courier" }, // Running Balance
      8: { cellWidth: 46.89, halign: "center" }, // Source
    },
    didParseCell: (hookData) => {
      // Align table headers matching their column content alignment
      if (hookData.section === "head") {
        if ([4, 5, 7].includes(hookData.column.index)) {
          hookData.cell.styles.halign = "right";
        } else if (hookData.column.index === 8) {
          hookData.cell.styles.halign = "center";
        }
      }
    },
    didDrawPage: (pageData) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED_INK);
      doc.text(
        `FinChat Ledger Statement — Page ${pageData.pageNumber} of ${pageCount}`,
        40,
        doc.internal.pageSize.height - 18
      );
    },
    margin: { left: 40, right: 40, top: 40, bottom: 30 },
  });

  doc.save(`finchat-transactions-${fromDateStr}-to-${toDateStr}.pdf`);
}
