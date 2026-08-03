import React from "react";
import Link from "next/link";
import { MessageSquare, Sparkles, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionHref?: string;
  actionText?: string;
  onActionClick?: () => void;
}

export function EmptyState({
  title = "No transactions logged yet",
  description = "Start by chatting with FinChat AI to log your first expense or income effortlessly.",
  actionHref = "/chat",
  actionText = "Log in AI Chat",
  onActionClick,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-12 text-center bg-card/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-inner mb-4">
        <Sparkles className="h-8 w-8 text-indigo-500 animate-pulse" />
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>

      <div className="mt-6 flex flex-wrap gap-2.5 justify-center">
        {actionHref && (
          <Button asChild variant="gradient" className="gap-2 shadow-md">
            <Link href={actionHref}>
              <MessageSquare className="h-4 w-4" />
              <span>{actionText}</span>
            </Link>
          </Button>
        )}
        {onActionClick && (
          <Button
            onClick={onActionClick}
            variant="outline"
            className="gap-2 border-border"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Manual Entry</span>
          </Button>
        )}
      </div>
    </div>
  );
}
