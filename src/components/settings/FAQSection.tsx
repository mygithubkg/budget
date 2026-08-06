"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, BookOpen, Send, Download, Key } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  items: FAQItem[];
}

const FAQ_DATA: FAQCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    items: [
      {
        q: "How do I log an expense or income?",
        a: "Navigate to the AI Register screen and type or speak naturally — for instance, 'Spent 450 on grocery shopping' or 'Received 25000 freelance payout'. You can also tap the '+ Manual Entry' button in the sidebar or mobile menu to open a structured record sheet.",
      },
      {
        q: "How does FinChat know which category an entry belongs to?",
        a: "The assistant reads your sentence and intelligently matches it against your custom categories (or standard defaults like Food & Dining, Travel, Bills, etc.). If you log a brand new category name, FinChat automatically creates it for you.",
      },
      {
        q: "Can I log multiple expenses in a single message?",
        a: "Yes! FinChat is built to parse complex multi-item messages in one go. For example, saying 'Paid 500 for groceries, 250 for taxi and 1200 for electricity bill' extracts, itemizes, and stamps each transaction independently in your ledger.",
      },
      {
        q: "How do I split a cost with a friend and settle up?",
        a: "Simply mention who you split with — for example, 'Dinner was 900, Rohit owes 300' or 'I owe Sam 500 for tickets'. FinChat maintains a running balance under 'Friend Debts' where you can review your tabs and record settlements with one click.",
      },
    ],
  },
  {
    id: "telegram",
    title: "Telegram Bot Integration",
    icon: Send,
    items: [
      {
        q: "How do I connect my account to Telegram?",
        a: "Go to Settings > Telegram Bot Connection, tap 'Generate Linking Code', then open @FinChatLedgerBot on Telegram and send '/start <your_code>'. Your account will link instantly in real time.",
      },
      {
        q: "My linking code expired or isn't working — what should I do?",
        a: "Linking codes automatically expire after 10 minutes for your security. Simply click 'Generate Linking Code' again on the Settings page to create a fresh one-time code and send it to the bot.",
      },
      {
        q: "How do I disconnect Telegram from my account?",
        a: "You can click 'Disconnect Telegram' in the Telegram card under Settings at any time. Once disconnected, the bot immediately stops processing messages for your ledger.",
      },
      {
        q: "Why can't I edit a transaction the bot logged — only confirm or cancel it?",
        a: "To maintain ledger passbook integrity, messages received via Telegram are presented as atomic proposals. If an entry is incorrect, simply tap Cancel in Telegram and re-phrase the entry or adjust it on the Web Ledger.",
      },
    ],
  },
  {
    id: "export",
    title: "Exporting Data",
    icon: Download,
    items: [
      {
        q: "How do I export my ledger transactions?",
        a: "Scroll to the 'Export Transactions' section in Settings, pick your desired start and end dates, and click CSV, Excel (.xlsx), or PDF Statement. The file is generated in-memory directly within your browser and downloaded instantly.",
      },
      {
        q: "Why is the Export button disabled?",
        a: "The button disables if your selected 'From Date' is after your 'To Date', or if there are no logged transactions within the chosen timeframe.",
      },
      {
        q: "Why does it say 'No transactions found' for my date range?",
        a: "This means no income or expense entries were recorded on or between the dates you picked. Adjust your From Date earlier to capture older entries.",
      },
      {
        q: "Can I export to a date in the future?",
        a: "No. The date selector is restricted to today's date at maximum, as financial ledgers cannot contain future-dated entries.",
      },
    ],
  },
  {
    id: "byok",
    title: "Using Your Own AI Key (BYOK)",
    icon: Key,
    items: [
      {
        q: "What is 'Bring Your Own Key' (BYOK) and why would I use it?",
        a: "BYOK allows you to connect your personal API key from Groq, Google Gemini, or Anthropic Claude. This provides zero markup, personal rate limits, model flexibility (such as Claude 3.5 Sonnet or Gemini 2.5 Flash), and complete ownership of your AI usage.",
      },
      {
        q: "Where do I get an API key for Groq, Gemini, or Claude?",
        a: "You can generate keys from the respective provider developer portals: Groq (console.groq.com), Google Gemini (aistudio.google.com), and Anthropic Claude (console.anthropic.com). Direct links are provided in the AI Provider card above.",
      },
      {
        q: "What happens if my personal key runs out of quota or is invalid?",
        a: "If your personal key encounters an error, FinChat displays a clear message informing you of the issue with your key. It will not silently consume default keys without your knowledge.",
      },
      {
        q: "How do I switch back to FinChat's default AI?",
        a: "Open the AI Provider section in Settings, select 'FinChat Default' (or click the Trash / Revert button), and save. Your stored key will be removed immediately.",
      },
    ],
  },
];

export function FAQSection() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    "getting-started-0": true, // open first by default
  });

  const toggleItem = (key: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="rounded-xl border border-fiber-line bg-card-bg p-5 shadow-sm space-y-6 text-ink-text">
      {/* Section Header */}
      <div className="flex items-center gap-2 border-b border-fiber-line pb-2.5">
        <HelpCircle className="h-4 w-4 text-stamp-red" />
        <h2 className="font-display text-base font-bold text-ink-text">
          Frequently Asked Questions & Guide
        </h2>
      </div>

      <div className="space-y-6">
        {FAQ_DATA.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.id} className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono uppercase text-muted-text">
                <Icon className="h-3.5 w-3.5 text-stamp-red" />
                <span className="font-bold tracking-wider">{cat.title}</span>
              </div>

              <div className="divide-y divide-fiber-line border border-fiber-line rounded-lg bg-paper-bg/50 overflow-hidden">
                {cat.items.map((item, idx) => {
                  const key = `${cat.id}-${idx}`;
                  const isOpen = !!openItems[key];

                  return (
                    <div key={key} className="transition-colors">
                      <button
                        type="button"
                        onClick={() => toggleItem(key)}
                        className="w-full flex items-center justify-between gap-3 p-3.5 text-left hover:bg-card-bg/60 transition-colors"
                      >
                        <span className="text-xs font-medium text-ink-text font-sans">
                          {item.q}
                        </span>
                        <div className="text-muted-text shrink-0">
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-3.5 pb-3.5 pt-0 text-xs font-sans text-muted-text leading-relaxed bg-card-bg/30 border-t border-fiber-line/40">
                          <p className="pt-2">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
