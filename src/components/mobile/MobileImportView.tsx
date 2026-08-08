"use client";

import React, { useMemo, useRef } from "react";
import { formatCurrency } from "@/lib/currency";
import { getMobileCategoryTheme } from "@/lib/mobile-theme";
import { ImportParseResult, ImportPreviewItem } from "@/types";
import { motion, useReducedMotion } from "motion/react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { Loader2 } from "lucide-react";
import Link from "next/link";

interface MobileImportViewProps {
  mode: "upload" | "review";
  isProcessing: boolean;
  processingStage: string;
  isImporting: boolean;
  dragActive: boolean;
  parseResult: ImportParseResult | null;
  items: ImportPreviewItem[];
  filteredItems: ImportPreviewItem[];
  paginatedItems: ImportPreviewItem[];
  selectedItems: ImportPreviewItem[];
  totalSelectedExpense: number;
  totalSelectedIncome: number;
  filterTab: "all" | "selected" | "duplicates" | "expense" | "income";
  searchQuery: string;
  currency: string;
  page: number;
  totalPages: number;
  categoryNames: string[];
  onFileUpload: (file: File) => void;
  onDrag: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFilterTabChange: (
    tab: "all" | "selected" | "duplicates" | "expense" | "income"
  ) => void;
  onSearchChange: (q: string) => void;
  onToggleItemSelect: (tempId: string) => void;
  onUpdateItemCategory: (tempId: string, category: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectNonDuplicates: () => void;
  onPageChange: (page: number) => void;
  onConfirmImport: () => void;
  onResetUpload: () => void;
}

export function MobileImportView({
  mode,
  isProcessing,
  processingStage,
  isImporting,
  dragActive,
  parseResult,
  items,
  filteredItems,
  paginatedItems,
  selectedItems,
  totalSelectedExpense,
  totalSelectedIncome,
  filterTab,
  searchQuery,
  currency,
  page,
  totalPages,
  categoryNames,
  onFileUpload,
  onDrag,
  onDrop,
  onFilterTabChange,
  onSearchChange,
  onToggleItemSelect,
  onUpdateItemCategory,
  onSelectAll,
  onDeselectAll,
  onSelectNonDuplicates,
  onPageChange,
  onConfirmImport,
  onResetUpload,
}: MobileImportViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4 px-3.5 py-2 pb-24 text-md-on-surface font-inter">
      {/* ── Page Title ── */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-md-on-surface font-inter">
            Import
          </h1>
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-md-secondary-container text-md-on-secondary-container font-inter">
            <MaterialIcon name="auto_awesome" size={10} />
            AI
          </span>
        </div>
        <p className="text-xs text-md-on-surface-variant font-inter">
          Upload statements or expense logs to import.
        </p>
      </div>

      {/* ── UPLOAD MODE ── */}
      {mode === "upload" && (
        <>
          {isProcessing ? (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-[24px] bg-md-surface-container-high border border-fiber-line dark:border-white/[0.08] p-8 text-center md-hero-shadow space-y-4"
            >
              <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-md-primary/15 text-md-primary animate-pulse">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-bold text-md-on-surface font-inter">
                  Processing Document
                </h3>
                <p className="text-xs text-md-primary font-inter mt-1">
                  {processingStage}
                </p>
              </div>
              <p className="text-[11px] text-md-on-surface-variant font-inter max-w-xs mx-auto">
                File processed in-memory and never persisted.
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onDragEnter={onDrag}
              onDragLeave={onDrag}
              onDragOver={onDrag}
              onDrop={onDrop}
              className={`relative rounded-[24px] border-2 border-dashed transition-all p-6 text-center md-card-shadow ${
                dragActive
                  ? "border-md-primary bg-md-primary-container/10"
                  : "border-fiber-line dark:border-white/[0.12] bg-md-surface-container hover:border-md-primary/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.docx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onFileUpload(e.target.files[0]);
                  }
                }}
              />

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-md-primary/15 text-md-primary mb-4">
                <MaterialIcon name="cloud_upload" size={28} />
              </div>

              <h2 className="text-base font-bold text-md-on-surface font-inter mb-1">
                Drop your file here
              </h2>
              <p className="text-xs text-md-on-surface-variant font-inter mb-5">
                Excel (.xlsx, .xls), CSV (.csv), or Word (.docx) up to 10MB.
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full rounded-full bg-md-on-surface text-md-surface py-3 text-sm font-bold font-inter shadow-md active:scale-95 transition-transform"
              >
                <MaterialIcon name="file_open" size={18} />
                <span>Select File</span>
              </button>
            </motion.div>
          )}

          {/* Info Cards */}
          {!isProcessing && (
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-md-tertiary-container/30 text-md-tertiary">
                    <MaterialIcon name="table_chart" size={14} />
                  </div>
                  <span className="text-[11px] font-bold text-md-on-surface font-inter">
                    Tabular
                  </span>
                </div>
                <p className="text-[10px] text-md-on-surface-variant font-inter leading-relaxed">
                  Auto-detects columns & categorizes with AI.
                </p>
              </motion.div>

              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-md-error-container/30 text-md-error">
                    <MaterialIcon name="description" size={14} />
                  </div>
                  <span className="text-[11px] font-bold text-md-on-surface font-inter">
                    Prose
                  </span>
                </div>
                <p className="text-[10px] text-md-on-surface-variant font-inter leading-relaxed">
                  Natural language parsing from Word diaries.
                </p>
              </motion.div>
            </div>
          )}
        </>
      )}

      {/* ── REVIEW MODE ── */}
      {mode === "review" && parseResult && (
        <div className="space-y-4">
          {/* Summary Metric Cards (2×2) */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-md-on-surface-variant font-inter">
                Extracted
              </span>
              <p className="text-xl font-bold font-jetbrains-mono text-md-on-surface tabular-nums mt-1">
                {parseResult.totalRowsFound}
              </p>
              <p className="text-[10px] text-md-on-surface-variant font-inter truncate mt-0.5">
                {parseResult.fileName}
              </p>
            </motion.div>

            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-md-on-surface-variant font-inter">
                Selected
              </span>
              <p className="text-xl font-bold font-jetbrains-mono text-md-tertiary tabular-nums mt-1">
                {selectedItems.length}
              </p>
              <p className="text-[10px] text-md-on-surface-variant font-inter mt-0.5">
                {((selectedItems.length / (items.length || 1)) * 100).toFixed(0)}% checked
              </p>
            </motion.div>

            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-md-on-surface-variant font-inter">
                Duplicates
              </span>
              <p
                className={`text-xl font-bold font-jetbrains-mono tabular-nums mt-1 ${
                  parseResult.duplicatesCount > 0
                    ? "text-md-error"
                    : "text-md-on-surface"
                }`}
              >
                {parseResult.duplicatesCount}
              </p>
              <p className="text-[10px] text-md-on-surface-variant font-inter mt-0.5">
                Unchecked
              </p>
            </motion.div>

            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-md-on-surface-variant font-inter">
                Expense
              </span>
              <p className="text-xl font-bold font-jetbrains-mono text-md-error tabular-nums mt-1">
                {formatCurrency(totalSelectedExpense, currency)}
              </p>
              <p className="text-[10px] text-md-tertiary font-inter mt-0.5">
                Inc: {formatCurrency(totalSelectedIncome, currency)}
              </p>
            </motion.div>
          </div>

          {/* Filter & Search Bar */}
          <div className="space-y-3">
            {/* Filter Tabs */}
            <div className="flex rounded-full bg-md-surface-container-high border border-fiber-line dark:border-white/[0.06] p-1 text-[10px] font-medium overflow-x-auto gap-0.5 no-scrollbar">
              {(
                [
                  { key: "all", label: `All (${items.length})` },
                  { key: "selected", label: `Selected (${selectedItems.length})` },
                  { key: "expense", label: "Expenses" },
                  { key: "income", label: "Income" },
                ] as {
                  key: "all" | "selected" | "duplicates" | "expense" | "income";
                  label: string;
                }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onFilterTabChange(tab.key)}
                  className={`flex-1 py-1.5 px-2 rounded-full text-center whitespace-nowrap transition-all font-inter ${
                    filterTab === tab.key
                      ? "bg-md-surface-bright text-md-on-surface font-bold shadow-sm"
                      : "text-md-on-surface-variant"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <MaterialIcon
                name="search"
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-md-on-surface-variant"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-full border border-fiber-line dark:border-white/[0.06] bg-md-surface-container-high pl-10 pr-4 py-2.5 text-sm font-inter text-md-on-surface focus:border-md-primary focus:outline-none"
              />
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={onSelectAll}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-fiber-line dark:border-white/[0.06] bg-md-surface-container text-[11px] font-medium text-md-on-surface font-inter whitespace-nowrap active:scale-95 transition-transform"
              >
                <MaterialIcon name="select_all" size={14} />
                All
              </button>
              <button
                onClick={onDeselectAll}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-fiber-line dark:border-white/[0.06] bg-md-surface-container text-[11px] font-medium text-md-on-surface font-inter whitespace-nowrap active:scale-95 transition-transform"
              >
                <MaterialIcon name="deselect" size={14} />
                None
              </button>
              {parseResult.duplicatesCount > 0 && (
                <button
                  onClick={onSelectNonDuplicates}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-fiber-line dark:border-white/[0.06] bg-md-surface-container text-[11px] font-medium text-md-on-surface font-inter whitespace-nowrap active:scale-95 transition-transform"
                >
                  <MaterialIcon name="filter_alt" size={14} />
                  Non-Dupes
                </button>
              )}
              <button
                onClick={onResetUpload}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-fiber-line dark:border-white/[0.06] bg-md-surface-container text-[11px] font-medium text-md-on-surface-variant font-inter whitespace-nowrap active:scale-95 transition-transform ml-auto"
              >
                <MaterialIcon name="refresh" size={14} />
                New File
              </button>
            </div>
          </div>

          {/* Transaction Card List */}
          <div className="space-y-2.5">
            {paginatedItems.length === 0 ? (
              <div className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-8 text-center md-card-shadow">
                <p className="text-sm text-md-on-surface-variant font-inter">
                  No transactions match the filter.
                </p>
              </div>
            ) : (
              paginatedItems.map((item, idx) => {
                const isIncome = item.type === "income";
                const theme = getMobileCategoryTheme(item.category);

                return (
                  <motion.div
                    key={item.tempId}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.25,
                      delay: idx * 0.02,
                      ease: "easeOut",
                    }}
                    className={`relative rounded-[24px] border border-fiber-line dark:border-white/[0.06] p-3.5 md-card-shadow transition-all ${
                      item.selected
                        ? "bg-md-surface-container"
                        : "bg-md-surface-container/50 opacity-60"
                    } ${item.isDuplicate ? "border-amber-500/30" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => onToggleItemSelect(item.tempId)}
                        className="flex-shrink-0 mt-0.5"
                      >
                        <MaterialIcon
                          name={
                            item.selected
                              ? "check_circle"
                              : "radio_button_unchecked"
                          }
                          size={22}
                          fill={item.selected}
                          className={
                            item.selected
                              ? "text-md-primary"
                              : "text-md-on-surface-variant"
                          }
                        />
                      </button>

                      {/* Category Icon */}
                      <div
                        style={{
                          backgroundColor: theme.containerTint,
                          color: theme.iconColor,
                        }}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full shadow-inner"
                      >
                        <MaterialIcon name={theme.materialIcon} size={18} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-md-on-surface font-inter truncate">
                              {item.description}
                            </p>
                            <p className="text-[11px] text-md-on-surface-variant font-inter mt-0.5">
                              {item.date} • {item.category}
                            </p>
                          </div>
                          <span
                            className={`font-jetbrains-mono font-bold text-sm tabular-nums flex-shrink-0 ${
                              isIncome
                                ? "text-md-tertiary"
                                : "text-md-on-surface"
                            }`}
                          >
                            {isIncome ? "+" : "−"}
                            {formatCurrency(item.amount, currency)}
                          </span>
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-inter ${
                              isIncome
                                ? "bg-md-tertiary-container/20 text-md-tertiary"
                                : "bg-md-error-container/20 text-md-error"
                            }`}
                          >
                            {item.type}
                          </span>
                          {item.isDuplicate && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold font-inter">
                              <MaterialIcon name="warning" size={12} />
                              Duplicate
                            </span>
                          )}
                          {item.splits && item.splits.length > 0 && (
                            <span className="text-[10px] text-md-primary font-inter">
                              Split: {item.splits.map((s) => s.friendName).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs font-inter text-md-on-surface-variant">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-fiber-line dark:border-white/[0.06] bg-md-surface-container text-md-on-surface disabled:opacity-40 active:scale-95 transition-transform"
                >
                  <MaterialIcon name="chevron_left" size={18} />
                </button>
                <button
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-fiber-line dark:border-white/[0.06] bg-md-surface-container text-md-on-surface disabled:opacity-40 active:scale-95 transition-transform"
                >
                  <MaterialIcon name="chevron_right" size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Sticky Bottom Action Bar */}
          <div className="fixed bottom-20 left-3.5 right-3.5 z-30 rounded-[24px] bg-md-surface-container-high/95 backdrop-blur-xl border border-fiber-line dark:border-white/[0.08] p-3.5 shadow-[0_-4px_24px_rgba(0,0,0,0.2)] md-inner-rim flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-md-on-surface font-inter">
                {selectedItems.length} entries
              </p>
              <p className="text-[10px] text-md-on-surface-variant font-inter">
                {formatCurrency(totalSelectedExpense, currency)} expense
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={onResetUpload}
                disabled={isImporting}
                className="px-4 py-2.5 rounded-full border border-fiber-line dark:border-white/[0.06] text-sm font-medium text-md-on-surface-variant font-inter disabled:opacity-50 active:scale-95 transition-transform"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={onConfirmImport}
                disabled={selectedItems.length === 0 || isImporting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-md-on-surface text-md-surface text-sm font-bold font-inter shadow-md disabled:opacity-50 active:scale-95 transition-transform"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <MaterialIcon name="check_circle" size={18} />
                    <span>Import</span>
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

export default MobileImportView;
