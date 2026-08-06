import React from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionHref?: string;
  actionText?: string;
  onActionClick?: () => void;
}

export function EmptyState({
  title = "No ledger entries recorded yet",
  description = "Start by chatting in the register to record your first expense, income, or split.",
  actionHref = "/chat",
  actionText = "Open Register",
  onActionClick,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-fiber-line p-10 text-center bg-card-bg/60 text-ink-text">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-fiber-line bg-paper-bg text-stamp-red shadow-sm mb-3">
        <BookOpen className="h-5 w-5" />
      </div>
      <h3 className="font-display text-base font-bold text-ink-text">{title}</h3>
      <p className="mt-1 max-w-sm text-xs font-sans text-muted-text leading-relaxed">
        {description}
      </p>

      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {actionHref && (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-1.5 rounded-lg bg-stamp-red hover:bg-stamp-red/90 px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#FFFFFF] transition-colors shadow-sm"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>{actionText}</span>
          </Link>
        )}
        {onActionClick && (
          <button
            onClick={onActionClick}
            className="rounded-lg border border-fiber-line bg-paper-bg px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-ink-text hover:border-stamp-red transition-colors"
          >
            Manual Record
          </button>
        )}
      </div>
    </div>
  );
}
