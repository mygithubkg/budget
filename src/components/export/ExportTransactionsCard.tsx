"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth } from "date-fns";
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileType,
  Loader2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchEarliestTransactionDate,
  fetchAllUserTransactions,
  prepareExportData,
} from "@/lib/export/exportData";
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
} from "@/lib/export/exportGenerators";

type ExportFormat = "csv" | "xlsx" | "pdf";

export function ExportTransactionsCard() {
  const { user, userProfile } = useAuth();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const [fromDate, setFromDate] = useState<string>(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [toDate, setToDate] = useState<string>(todayStr);
  const [minSelectableDate, setMinSelectableDate] = useState<string>("2020-01-01");
  const [formatType, setFormatType] = useState<ExportFormat>("csv");

  const [isLoadingEarliest, setIsLoadingEarliest] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Initialize earliest transaction date for optimal "From" bounding
  useEffect(() => {
    let isMounted = true;
    async function loadBounds() {
      if (!user?.uid) return;
      try {
        setIsLoadingEarliest(true);
        const earliest = await fetchEarliestTransactionDate(user.uid);
        if (earliest && isMounted) {
          const earliestStr = format(earliest, "yyyy-MM-dd");
          setMinSelectableDate(earliestStr);
          setFromDate(earliestStr);
        }
      } catch (err) {
        console.warn("Could not retrieve earliest date:", err);
      } finally {
        if (isMounted) setIsLoadingEarliest(false);
      }
    }
    loadBounds();
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  // Validation rules
  const isFromAfterTo = Boolean(fromDate && toDate && fromDate > toDate);
  const isFutureTo = Boolean(toDate && toDate > todayStr);
  const isFutureFrom = Boolean(fromDate && fromDate > todayStr);
  const isRangeInvalid = isFromAfterTo || isFutureTo || isFutureFrom || !fromDate || !toDate;

  const handleExport = async () => {
    if (!user?.uid) {
      toast.error("Please sign in to export transactions.");
      return;
    }

    if (isRangeInvalid) {
      if (isFromAfterTo) {
        toast.error("'From' date cannot be after 'To' date.");
      } else if (isFutureTo || isFutureFrom) {
        toast.error("Future dates are not permitted in ledger exports.");
      }
      return;
    }

    try {
      setIsExporting(true);

      const allTx = await fetchAllUserTransactions(user.uid);
      const currency = userProfile?.currency || "INR";
      const fromObj = new Date(`${fromDate}T00:00:00`);
      const toObj = new Date(`${toDate}T23:59:59.999`);

      const exportData = prepareExportData(allTx, fromObj, toObj, currency);

      if (exportData.csvExcelRows.length === 0) {
        toast.info("No transactions found for this range.");
        return;
      }

      if (formatType === "csv") {
        exportToCSV(
          exportData.csvExcelRows,
          exportData.fromDateStr,
          exportData.toDateStr
        );
        toast.success(
          `Exported ${exportData.csvExcelRows.length} transactions as CSV`
        );
      } else if (formatType === "xlsx") {
        exportToExcel(
          exportData.csvExcelRows,
          exportData.fromDateStr,
          exportData.toDateStr
        );
        toast.success(
          `Exported ${exportData.csvExcelRows.length} transactions as Excel (.xlsx)`
        );
      } else if (formatType === "pdf") {
        exportToPDF(exportData);
        toast.success(
          `Exported ${exportData.csvExcelRows.length} transactions as Landscape PDF Statement`
        );
      }
    } catch (err: any) {
      console.error("Export failed:", err);
      toast.error("Failed to generate export. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-fiber-line pb-2.5">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-stamp-indigo" />
          <h2 className="font-display text-base font-bold text-ink-text">
            Export Ledger Register
          </h2>
        </div>
        <span className="text-[10px] font-mono uppercase text-muted-text px-1.5 py-0.5 border border-fiber-line rounded-[2px] bg-paper-bg">
          Client-Side In-Memory
        </span>
      </div>

      <p className="text-xs font-sans text-muted-text">
        Generate custom date-range statements in CSV, Excel (.xlsx), or landscape tabular PDF. All files are created locally in your browser with running passbook balances.
      </p>

      {/* Date Pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* From Date */}
        <div className="space-y-1">
          <label className="text-xs font-mono font-semibold text-ink-text flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-text" />
            <span>From Date</span>
            {isLoadingEarliest && (
              <Loader2 className="h-3 w-3 animate-spin text-stamp-indigo" />
            )}
          </label>
          <input
            type="date"
            value={fromDate}
            min={minSelectableDate}
            max={todayStr}
            onChange={(e) => setFromDate(e.target.value)}
            disabled={isExporting}
            className="w-full h-9 rounded-[4px] border border-fiber-line bg-paper-bg px-3 text-xs font-mono text-ink-text focus:border-stamp-indigo focus:outline-none transition-colors"
          />
          <span className="text-[10px] font-mono text-muted-text block">
            Earliest record: {minSelectableDate}
          </span>
        </div>

        {/* To Date */}
        <div className="space-y-1">
          <label className="text-xs font-mono font-semibold text-ink-text flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-text" />
            <span>To Date</span>
          </label>
          <input
            type="date"
            value={toDate}
            min={minSelectableDate}
            max={todayStr}
            onChange={(e) => setToDate(e.target.value)}
            disabled={isExporting}
            className="w-full h-9 rounded-[4px] border border-fiber-line bg-paper-bg px-3 text-xs font-mono text-ink-text focus:border-stamp-indigo focus:outline-none transition-colors"
          />
          <span className="text-[10px] font-mono text-muted-text block">
            Latest permitted: Today ({todayStr})
          </span>
        </div>
      </div>

      {/* Range Validation Warnings */}
      {isFromAfterTo && (
        <div className="flex items-center gap-2 p-2.5 rounded-[4px] bg-rule-red/10 border border-rule-red/30 text-rule-red text-xs font-mono">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Invalid date range: &quot;From&quot; date cannot be later than &quot;To&quot; date.</span>
        </div>
      )}

      {isFutureTo && (
        <div className="flex items-center gap-2 p-2.5 rounded-[4px] bg-rule-red/10 border border-rule-red/30 text-rule-red text-xs font-mono">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Future dates cannot be included in register exports.</span>
        </div>
      )}

      {/* Format Selector */}
      <div className="space-y-1.5 pt-1">
        <label className="text-xs font-mono font-semibold text-ink-text">
          Statement Format
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* CSV */}
          <button
            type="button"
            onClick={() => setFormatType("csv")}
            disabled={isExporting}
            className={`flex flex-col items-start p-3 rounded-[6px] border text-left transition-all ${
              formatType === "csv"
                ? "border-stamp-indigo bg-paper-bg ring-1 ring-stamp-indigo/30 shadow-xs"
                : "border-fiber-line bg-paper-bg/60 hover:bg-paper-bg hover:border-stamp-indigo/50"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <div className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-stamp-indigo" />
                <span className="font-display font-bold text-xs text-ink-text">
                  CSV (.csv)
                </span>
              </div>
              {formatType === "csv" && (
                <CheckCircle2 className="h-3.5 w-3.5 text-stamp-indigo" />
              )}
            </div>
            <p className="text-[10px] font-sans text-muted-text">
              Plain tabular text with UTF-8 BOM, ideal for spreadsheet reimport.
            </p>
          </button>

          {/* Excel */}
          <button
            type="button"
            onClick={() => setFormatType("xlsx")}
            disabled={isExporting}
            className={`flex flex-col items-start p-3 rounded-[6px] border text-left transition-all ${
              formatType === "xlsx"
                ? "border-stamp-indigo bg-paper-bg ring-1 ring-stamp-indigo/30 shadow-xs"
                : "border-fiber-line bg-paper-bg/60 hover:bg-paper-bg hover:border-stamp-indigo/50"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-display font-bold text-xs text-ink-text">
                  Excel (.xlsx)
                </span>
              </div>
              {formatType === "xlsx" && (
                <CheckCircle2 className="h-3.5 w-3.5 text-stamp-indigo" />
              )}
            </div>
            <p className="text-[10px] font-sans text-muted-text">
              Native Microsoft Excel workbook with optimized column widths.
            </p>
          </button>

          {/* PDF */}
          <button
            type="button"
            onClick={() => setFormatType("pdf")}
            disabled={isExporting}
            className={`flex flex-col items-start p-3 rounded-[6px] border text-left transition-all ${
              formatType === "pdf"
                ? "border-stamp-indigo bg-paper-bg ring-1 ring-stamp-indigo/30 shadow-xs"
                : "border-fiber-line bg-paper-bg/60 hover:bg-paper-bg hover:border-stamp-indigo/50"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <div className="flex items-center gap-1.5">
                <FileType className="h-4 w-4 text-rule-red" />
                <span className="font-display font-bold text-xs text-ink-text">
                  PDF Statement
                </span>
              </div>
              {formatType === "pdf" && (
                <CheckCircle2 className="h-3.5 w-3.5 text-stamp-indigo" />
              )}
            </div>
            <p className="text-[10px] font-sans text-muted-text">
              Landscape ruled register statement with summary banner & autotable.
            </p>
          </button>
        </div>
      </div>

      {/* Export Action Button */}
      <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-fiber-line">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-text">
          <HelpCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Calculates opening & running passbook balance strictly before start date.</span>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={isRangeInvalid || isExporting}
          className="w-full sm:w-auto h-9 px-5 rounded-[4px] border border-stamp-indigo/60 bg-stamp-indigo hover:bg-stamp-indigo/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-xs flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Generating Statement...</span>
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" />
              <span>Export {formatType.toUpperCase()}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
