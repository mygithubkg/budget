"use client";

import React, { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories } from "@/hooks/useCategories";
import { useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  CheckSquare,
  Square,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Info,
  Check,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { ImportParseResult, ImportPreviewItem } from "@/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories();
  const currency = userProfile?.currency || "INR";

  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [mode, setMode] = useState<"upload" | "review">("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [items, setItems] = useState<ImportPreviewItem[]>([]);

  // Filtering & Pagination
  const [filterTab, setFilterTab] = useState<
    "all" | "selected" | "duplicates" | "expense" | "income"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkCategory, setBulkCategory] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Category list names
  const categoryNames = useMemo(() => {
    const defaultList = [
      "Food & Dining",
      "Groceries",
      "Transport",
      "Utilities",
      "Shopping",
      "Entertainment",
      "Healthcare",
      "Salary",
      "Investment",
      "General",
    ];
    if (!categories || categories.length === 0) return defaultList;
    const names = categories.map((c) => c.name);
    return Array.from(new Set([...names, ...defaultList]));
  }, [categories]);

  // Handle File Upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv", "docx"].includes(ext || "")) {
      toast.error(
        "Unsupported format. Please upload an Excel (.xlsx, .xls), CSV (.csv), or Word (.docx) file."
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 10MB.");
      return;
    }

    setIsProcessing(true);
    setProcessingStage("Uploading & reading file in-memory...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Get Firebase Auth token
      const token = user ? await user.getIdToken() : "";

      setProcessingStage(
        ext === "docx"
          ? "Analyzing Word document & extracting entries..."
          : "Detecting column layout & categorizing transactions..."
      );

      const res = await fetch("/api/import/parse", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process import file");
      }

      setParseResult(data);
      setItems(data.items || []);
      setMode("review");
      setPage(1);

      toast.success(
        `Parsed ${data.totalRowsFound} transactions (${data.duplicatesCount} potential duplicates flagged)`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to process statement");
    } finally {
      setIsProcessing(false);
      setProcessingStage("");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Row Updates
  const toggleItemSelect = (tempId: string) => {
    setItems((prev) =>
      prev.map((i) => (i.tempId === tempId ? { ...i, selected: !i.selected } : i))
    );
  };

  const updateItemCategory = (tempId: string, category: string) => {
    setItems((prev) =>
      prev.map((i) => (i.tempId === tempId ? { ...i, category } : i))
    );
  };

  const updateItemDescription = (tempId: string, description: string) => {
    setItems((prev) =>
      prev.map((i) => (i.tempId === tempId ? { ...i, description } : i))
    );
  };

  const updateItemDate = (tempId: string, date: string) => {
    setItems((prev) =>
      prev.map((i) => (i.tempId === tempId ? { ...i, date } : i))
    );
  };

  // Bulk actions
  const selectAll = () => {
    setItems((prev) => prev.map((i) => ({ ...i, selected: true })));
  };

  const deselectAll = () => {
    setItems((prev) => prev.map((i) => ({ ...i, selected: false })));
  };

  const selectNonDuplicatesOnly = () => {
    setItems((prev) =>
      prev.map((i) => ({ ...i, selected: !i.isDuplicate }))
    );
  };

  const applyBulkCategory = () => {
    if (!bulkCategory) {
      toast.error("Please select a category to apply.");
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.selected ? { ...i, category: bulkCategory } : i))
    );
    toast.success(`Updated category for selected transactions.`);
  };

  // Filtered & Paginated items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Tab filter
      if (filterTab === "selected" && !item.selected) return false;
      if (filterTab === "duplicates" && !item.isDuplicate) return false;
      if (filterTab === "expense" && item.type !== "expense") return false;
      if (filterTab === "income" && item.type !== "income") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = item.description.toLowerCase().includes(q);
        const catMatch = item.category.toLowerCase().includes(q);
        const amtMatch = String(item.amount).includes(q);
        const dateMatch = item.date.includes(q);
        if (!descMatch && !catMatch && !amtMatch && !dateMatch) return false;
      }

      return true;
    });
  }, [items, filterTab, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  // Selected Metrics
  const selectedItems = useMemo(() => items.filter((i) => i.selected), [items]);
  const totalSelectedExpense = useMemo(
    () =>
      selectedItems
        .filter((i) => i.type === "expense")
        .reduce((sum, i) => sum + i.amount, 0),
    [selectedItems]
  );
  const totalSelectedIncome = useMemo(
    () =>
      selectedItems
        .filter((i) => i.type === "income")
        .reduce((sum, i) => sum + i.amount, 0),
    [selectedItems]
  );

  // Commit Import
  const handleConfirmImport = async () => {
    if (selectedItems.length === 0) {
      toast.error("No transactions are selected for import.");
      return;
    }

    setIsImporting(true);
    try {
      const token = user ? await user.getIdToken() : "";
      const res = await fetch("/api/import/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: selectedItems,
          fileName: parseResult?.fileName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to commit imported transactions");
      }

      // Invalidate queries to refresh dashboard & ledger
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["analysis"] });
      await queryClient.invalidateQueries({ queryKey: ["friends"] });

      toast.success(
        `Successfully imported ${data.importedCount} transactions to your ledger!`
      );
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to save imported transactions");
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-fiber-line pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-text uppercase tracking-widest">
              Ledger Tool
            </span>
            <span className="rounded bg-stamp-indigo/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-stamp-indigo uppercase">
              AI Assisted
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink-text">
            Import Statement & Logs
          </h1>
          <p className="text-xs sm:text-sm text-muted-text max-w-2xl">
            Upload previous bank statements (.xlsx, .xls, .csv) or personal expense notes (.docx). Review and edit extracted rows before importing into your ledger.
          </p>
        </div>

        {mode === "review" && (
          <button
            onClick={() => {
              setMode("upload");
              setParseResult(null);
              setItems([]);
            }}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-[4px] border border-fiber-line bg-card-bg px-3 py-1.5 text-xs font-mono font-medium text-ink-text hover:bg-paper-bg transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Upload Another File</span>
          </button>
        )}
      </div>

      {/* Upload State */}
      {mode === "upload" && (
        <div className="space-y-6">
          {isProcessing ? (
            <div className="rounded-[8px] border border-fiber-line bg-card-bg p-12 text-center space-y-4 shadow-sm">
              <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-stamp-indigo/10 text-stamp-indigo animate-pulse">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-lg font-bold text-ink-text">
                  Processing Your Document
                </h3>
                <p className="text-xs font-mono text-stamp-indigo">
                  {processingStage}
                </p>
              </div>
              <p className="text-[11px] text-muted-text max-w-md mx-auto">
                Deterministic column mapping and batched category alignment in progress. Your file is processed strictly in-memory and never persisted.
              </p>
            </div>
          ) : (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative rounded-[8px] border-2 border-dashed transition-all p-8 sm:p-12 text-center bg-card-bg shadow-sm ${
                dragActive
                  ? "border-stamp-indigo bg-stamp-indigo/5"
                  : "border-fiber-line hover:border-stamp-indigo/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.docx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stamp-indigo/10 text-stamp-indigo mb-4">
                <UploadCloud className="h-7 w-7" />
              </div>

              <h2 className="font-display text-base sm:text-lg font-bold text-ink-text mb-1">
                Drag and drop your statement or expense log here
              </h2>
              <p className="text-xs text-muted-text mb-6 max-w-md mx-auto">
                Supports Microsoft Excel (<strong>.xlsx, .xls</strong>), Comma Separated (<strong>.csv</strong>), and Word expense diaries (<strong>.docx</strong>) up to 10MB.
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-[4px] bg-stamp-indigo px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-[#EDE7D6] hover:bg-stamp-indigo/90 shadow-sm transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Select File from Device</span>
              </button>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-fiber-line text-left">
                <div className="rounded-[6px] border border-fiber-line p-3.5 bg-paper-bg space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-ink-text">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-stamp-emerald" />
                    <span>Path A: Tabular Statements (.xlsx, .csv)</span>
                  </div>
                  <p className="text-[11px] text-muted-text leading-relaxed">
                    Auto-detects debit/credit or signed amount columns with deterministic math. Categorizes descriptions via batch AI.
                  </p>
                </div>

                <div className="rounded-[6px] border border-fiber-line p-3.5 bg-paper-bg space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-ink-text">
                    <FileText className="h-3.5 w-3.5 text-stamp-indigo" />
                    <span>Path B: Prose Diaries (.docx)</span>
                  </div>
                  <p className="text-[11px] text-muted-text leading-relaxed">
                    Converts written text paragraphs using FinChat&apos;s natural language expense parser, including friend splits.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review State */}
      {mode === "review" && parseResult && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-[6px] border border-fiber-line bg-card-bg p-3.5 shadow-sm space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-text">
                Total Extracted
              </span>
              <p className="font-mono text-xl font-bold text-ink-text">
                {parseResult.totalRowsFound}
              </p>
              <span className="text-[10px] font-mono text-muted-text truncate block">
                {parseResult.fileName}
              </span>
            </div>

            <div className="rounded-[6px] border border-fiber-line bg-card-bg p-3.5 shadow-sm space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-text">
                Ready to Import
              </span>
              <p className="font-mono text-xl font-bold text-stamp-emerald">
                {selectedItems.length}
              </p>
              <span className="text-[10px] font-mono text-muted-text">
                {((selectedItems.length / (items.length || 1)) * 100).toFixed(0)}% selected
              </span>
            </div>

            <div className="rounded-[6px] border border-fiber-line bg-card-bg p-3.5 shadow-sm space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-text">
                Possible Duplicates
              </span>
              <p
                className={`font-mono text-xl font-bold ${
                  parseResult.duplicatesCount > 0
                    ? "text-stamp-terracotta"
                    : "text-ink-text"
                }`}
              >
                {parseResult.duplicatesCount}
              </p>
              <span className="text-[10px] font-mono text-muted-text">
                Unchecked by default
              </span>
            </div>

            <div className="rounded-[6px] border border-fiber-line bg-card-bg p-3.5 shadow-sm space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-text">
                Selected Expenses
              </span>
              <p className="font-mono text-xl font-bold text-stamp-terracotta">
                {formatCurrency(totalSelectedExpense, currency)}
              </p>
              <span className="text-[10px] font-mono text-stamp-emerald">
                Income: {formatCurrency(totalSelectedIncome, currency)}
              </span>
            </div>
          </div>

          {/* Controls Bar: Filters, Search & Bulk Actions */}
          <div className="rounded-[8px] border border-fiber-line bg-card-bg p-4 shadow-sm space-y-4">
            {/* Top row: Filter Tabs & Search */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Tab Pills */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-paper-bg rounded-[6px] border border-fiber-line text-xs font-mono">
                <button
                  onClick={() => {
                    setFilterTab("all");
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-[4px] transition-colors ${
                    filterTab === "all"
                      ? "bg-card-bg text-ink-text font-bold shadow-sm"
                      : "text-muted-text hover:text-ink-text"
                  }`}
                >
                  All ({items.length})
                </button>
                <button
                  onClick={() => {
                    setFilterTab("selected");
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-[4px] transition-colors ${
                    filterTab === "selected"
                      ? "bg-card-bg text-ink-text font-bold shadow-sm"
                      : "text-muted-text hover:text-ink-text"
                  }`}
                >
                  Selected ({selectedItems.length})
                </button>
                {parseResult.duplicatesCount > 0 && (
                  <button
                    onClick={() => {
                      setFilterTab("duplicates");
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-[4px] transition-colors ${
                      filterTab === "duplicates"
                        ? "bg-card-bg text-stamp-terracotta font-bold shadow-sm"
                        : "text-muted-text hover:text-stamp-terracotta"
                    }`}
                  >
                    Duplicates ({parseResult.duplicatesCount})
                  </button>
                )}
                <button
                  onClick={() => {
                    setFilterTab("expense");
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-[4px] transition-colors ${
                    filterTab === "expense"
                      ? "bg-card-bg text-ink-text font-bold shadow-sm"
                      : "text-muted-text hover:text-ink-text"
                  }`}
                >
                  Expenses
                </button>
                <button
                  onClick={() => {
                    setFilterTab("income");
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-[4px] transition-colors ${
                    filterTab === "income"
                      ? "bg-card-bg text-ink-text font-bold shadow-sm"
                      : "text-muted-text hover:text-ink-text"
                  }`}
                >
                  Income
                </button>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[240px]">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-text" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search description, category..."
                  className="w-full rounded-[4px] border border-fiber-line bg-paper-bg pl-8 pr-3 py-1.5 text-xs font-sans text-ink-text focus:border-stamp-indigo focus:outline-none"
                />
              </div>
            </div>

            {/* Bottom row: Selection shortcuts & Bulk Category */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-fiber-line text-xs font-mono">
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] border border-fiber-line bg-paper-bg text-ink-text hover:bg-card-bg"
                >
                  <CheckSquare className="h-3 w-3 text-stamp-indigo" />
                  <span>Select All</span>
                </button>
                <button
                  onClick={deselectAll}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] border border-fiber-line bg-paper-bg text-ink-text hover:bg-card-bg"
                >
                  <Square className="h-3 w-3 text-muted-text" />
                  <span>Deselect All</span>
                </button>
                {parseResult.duplicatesCount > 0 && (
                  <button
                    onClick={selectNonDuplicatesOnly}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] border border-fiber-line bg-paper-bg text-ink-text hover:bg-card-bg"
                  >
                    <span>Select Non-Duplicates Only</span>
                  </button>
                )}
              </div>

              {/* Bulk category update */}
              <div className="flex items-center gap-2">
                <span className="text-muted-text text-[11px]">Bulk Category:</span>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className="rounded-[4px] border border-fiber-line bg-paper-bg px-2.5 py-1 text-xs font-mono text-ink-text focus:outline-none"
                >
                  <option value="">Choose category...</option>
                  {categoryNames.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  onClick={applyBulkCategory}
                  disabled={!bulkCategory || selectedItems.length === 0}
                  className="rounded-[4px] bg-stamp-indigo px-3 py-1 text-xs font-mono font-bold text-[#EDE7D6] hover:bg-stamp-indigo/90 disabled:opacity-40"
                >
                  Apply to {selectedItems.length}
                </button>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="rounded-[8px] border border-fiber-line bg-card-bg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-fiber-line bg-paper-bg text-[10px] font-mono uppercase tracking-wider text-muted-text">
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          paginatedItems.length > 0 &&
                          paginatedItems.every((i) => i.selected)
                        }
                        onChange={(e) => {
                          const check = e.target.checked;
                          const ids = new Set(paginatedItems.map((p) => p.tempId));
                          setItems((prev) =>
                            prev.map((i) =>
                              ids.has(i.tempId) ? { ...i, selected: check } : i
                            )
                          );
                        }}
                        className="rounded border-fiber-line text-stamp-indigo focus:ring-0"
                      />
                    </th>
                    <th className="py-2.5 px-3 w-28">Date</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 w-24">Type</th>
                    <th className="py-2.5 px-3 w-40">Category</th>
                    <th className="py-2.5 px-3 w-28 text-right">Amount</th>
                    <th className="py-2.5 px-3 w-32">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fiber-line text-xs font-sans">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-text font-mono text-xs">
                        No transactions match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => (
                      <tr
                        key={item.tempId}
                        className={`transition-colors ${
                          item.selected
                            ? "bg-card-bg hover:bg-paper-bg/60"
                            : "bg-paper-bg/40 opacity-60 hover:opacity-100"
                        } ${item.isDuplicate ? "bg-amber-500/5" : ""}`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleItemSelect(item.tempId)}
                            className="rounded border-fiber-line text-stamp-indigo focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Date */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-ink-text whitespace-nowrap">
                          <input
                            type="date"
                            value={item.date}
                            onChange={(e) =>
                              updateItemDate(item.tempId, e.target.value)
                            }
                            className="bg-transparent border-0 font-mono text-[11px] text-ink-text focus:outline-none focus:ring-1 focus:ring-stamp-indigo rounded px-1 -ml-1"
                          />
                        </td>

                        {/* Description */}
                        <td className="py-2.5 px-3 font-medium text-ink-text max-w-xs sm:max-w-md">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              updateItemDescription(item.tempId, e.target.value)
                            }
                            className="w-full bg-transparent border-0 text-xs font-sans text-ink-text focus:outline-none focus:ring-1 focus:ring-stamp-indigo rounded px-1 -ml-1 truncate"
                          />
                          {item.splits && item.splits.length > 0 && (
                            <span className="block text-[10px] font-mono text-stamp-indigo mt-0.5">
                              Splits with: {item.splits.map((s) => s.friendName).join(", ")}
                            </span>
                          )}
                        </td>

                        {/* Type Badge */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              item.type === "income"
                                ? "bg-stamp-emerald/10 text-stamp-emerald"
                                : "bg-stamp-terracotta/10 text-stamp-terracotta"
                            }`}
                          >
                            {item.type}
                          </span>
                        </td>

                        {/* Category Dropdown */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <select
                            value={item.category}
                            onChange={(e) =>
                              updateItemCategory(item.tempId, e.target.value)
                            }
                            className="w-full rounded border border-fiber-line bg-paper-bg px-2 py-1 text-xs font-mono text-ink-text focus:border-stamp-indigo focus:outline-none"
                          >
                            {categoryNames.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Amount */}
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            item.type === "income"
                              ? "text-stamp-emerald"
                              : "text-ink-text"
                          }`}
                        >
                          {item.type === "income" ? "+" : "-"}
                          {formatCurrency(item.amount, currency)}
                        </td>

                        {/* Status / Duplicate Tag */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {item.isDuplicate ? (
                            <span
                              title={item.duplicateReason}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-bold cursor-help"
                            >
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span>Duplicate</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-text">
                              <Check className="h-3 w-3 text-stamp-emerald" />
                              <span>New</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t border-fiber-line bg-paper-bg text-xs font-mono text-muted-text">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded border border-fiber-line bg-card-bg px-2 py-0.5 text-xs font-mono text-ink-text"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>
                  Showing {filteredItems.length === 0 ? 0 : (page - 1) * pageSize + 1}–
                  {Math.min(page * pageSize, filteredItems.length)} of{" "}
                  {filteredItems.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded border border-fiber-line bg-card-bg text-ink-text disabled:opacity-40 hover:bg-paper-bg"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1 rounded border border-fiber-line bg-card-bg text-ink-text disabled:opacity-40 hover:bg-paper-bg"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-4 z-20 rounded-[8px] border border-fiber-line bg-card-bg/95 backdrop-blur p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-muted-text">Importing:</span>
              <strong className="text-ink-text font-bold">
                {selectedItems.length} transactions
              </strong>
              <span className="text-muted-text">
                (Expenses: {formatCurrency(totalSelectedExpense, currency)})
              </span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setMode("upload");
                  setParseResult(null);
                  setItems([]);
                }}
                disabled={isImporting}
                className="px-4 py-2 rounded-[4px] border border-fiber-line text-xs font-mono text-muted-text hover:text-ink-text disabled:opacity-50"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={selectedItems.length === 0 || isImporting}
                className="inline-flex items-center gap-2 rounded-[4px] bg-stamp-indigo px-6 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#EDE7D6] hover:bg-stamp-indigo/90 shadow-sm disabled:opacity-50 transition-colors"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Writing to Ledger...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Import {selectedItems.length} Transactions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
