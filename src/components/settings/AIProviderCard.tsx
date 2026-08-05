"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Cpu,
  Key,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { BYOK_MODEL_OPTIONS } from "@/lib/ai/constants";

export function AIProviderCard() {
  const { getIdToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSet, setIsSet] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [last4, setLast4] = useState<string | null>(null);

  // Form state
  const [mode, setMode] = useState<"default" | "custom">("default");
  const [selectedProvider, setSelectedProvider] = useState<"groq" | "gemini" | "claude">("groq");
  const [selectedModel, setSelectedModel] = useState<string>("llama-3.3-70b-versatile");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const token = await getIdToken();
        if (!token) return;

        const res = await fetch("/api/settings/ai-provider", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setIsSet(!!data.isSet);
          if (data.isSet) {
            setCurrentProvider(data.provider);
            setCurrentModel(data.model);
            setLast4(data.last4);
            setMode("custom");
            setSelectedProvider(data.provider || "groq");
            setSelectedModel(data.model || BYOK_MODEL_OPTIONS.groq[0].id);
          } else {
            setMode("default");
          }
        }
      } catch (err) {
        console.error("Failed to load AI config:", err);
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, [getIdToken]);

  const handleProviderChange = (prov: "groq" | "gemini" | "claude") => {
    setSelectedProvider(prov);
    const defaultModel = BYOK_MODEL_OPTIONS[prov].find((m) => m.recommended)?.id || BYOK_MODEL_OPTIONS[prov][0].id;
    setSelectedModel(defaultModel);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "custom" && !apiKey.trim() && !isSet) {
      toast.error("Please enter a valid API key");
      return;
    }

    setSaving(true);
    try {
      const token = await getIdToken();
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const payload =
        mode === "default"
          ? { mode: "default" }
          : {
              mode: "custom",
              provider: selectedProvider,
              model: selectedModel,
              apiKey: apiKey.trim(),
            };

      const res = await fetch("/api/settings/ai-provider", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save AI configuration");
      }

      if (mode === "default") {
        setIsSet(false);
        setCurrentProvider(null);
        setCurrentModel(null);
        setLast4(null);
        setIsEditing(false);
        setApiKey("");
        toast.success("Switched to FinChat's default AI");
      } else {
        setIsSet(true);
        setCurrentProvider(data.provider);
        setCurrentModel(data.model);
        setLast4(data.last4);
        setIsEditing(false);
        setApiKey("");
        toast.success("Personal AI key saved and encrypted securely");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update AI settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch("/api/settings/ai-provider", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: "default" }),
      });

      if (res.ok) {
        setIsSet(false);
        setCurrentProvider(null);
        setCurrentModel(null);
        setLast4(null);
        setMode("default");
        setIsEditing(false);
        setApiKey("");
        toast.success("Custom key removed. Reverted to FinChat default.");
      }
    } catch (err: any) {
      toast.error("Failed to remove key");
    } finally {
      setSaving(false);
    }
  };

  const getProviderPortalUrl = (prov: string) => {
    switch (prov) {
      case "groq":
        return "https://console.groq.com/keys";
      case "gemini":
        return "https://aistudio.google.com/app/apikey";
      case "claude":
        return "https://console.anthropic.com/settings/keys";
      default:
        return "#";
    }
  };

  return (
    <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-sm space-y-4 text-ink-text">
      <div className="flex items-center justify-between border-b border-fiber-line pb-2.5">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-stamp-indigo" />
          <h2 className="font-display text-base font-bold text-ink-text">
            AI Provider (Bring Your Own Key)
          </h2>
        </div>
        {isSet ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-stamp-emerald border border-stamp-emerald/30 bg-stamp-emerald/5 px-2 py-0.5 rounded-[3px]">
            <CheckCircle2 className="h-3 w-3" /> Custom Key Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase text-muted-text border border-fiber-line bg-paper-bg px-2 py-0.5 rounded-[3px]">
            FinChat Default
          </span>
        )}
      </div>

      <p className="text-xs font-sans text-muted-text leading-relaxed">
        Power the AI Register with your personal API key from Groq, Google Gemini, or Anthropic Claude.
        Your key is encrypted on the server with AES-256-GCM and never shared or logged.
      </p>

      {loading ? (
        <div className="py-6 flex items-center justify-center gap-2 text-xs font-mono text-muted-text">
          <Loader2 className="h-4 w-4 animate-spin text-stamp-indigo" />
          Loading configuration...
        </div>
      ) : isSet && !isEditing ? (
        /* Configured State View */
        <div className="rounded-[6px] border border-fiber-line bg-paper-bg p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase font-mono text-ink-text">
                  {currentProvider === "groq"
                    ? "Groq"
                    : currentProvider === "gemini"
                    ? "Google Gemini"
                    : "Anthropic Claude"}
                </span>
                <span className="text-[10px] font-mono text-muted-text px-1.5 py-0.2 border border-fiber-line rounded-[2px] bg-card-bg">
                  {currentModel}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-muted-text">
                <Key className="h-3 w-3" />
                <span>••••••••••••{last4}</span>
                <span className="text-[10px] text-passbook-gold flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> AES-256 Encrypted
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 rounded-[4px] border border-fiber-line bg-card-bg hover:bg-paper-bg text-xs font-mono text-ink-text transition-colors"
              >
                Change Key
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={saving}
                className="p-1.5 rounded-[4px] border border-rule-red/30 hover:border-rule-red text-rule-red hover:bg-rule-red/5 text-xs transition-colors"
                title="Revert to default"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Edit / Setup Form */
        <form onSubmit={handleSave} className="space-y-4 pt-1">
          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("default")}
              className={`p-3 rounded-[6px] border text-left transition-all ${
                mode === "default"
                  ? "border-stamp-indigo bg-stamp-indigo/5 ring-1 ring-stamp-indigo"
                  : "border-fiber-line bg-paper-bg hover:bg-card-bg"
              }`}
            >
              <div className="text-xs font-bold font-display text-ink-text">FinChat Default</div>
              <div className="text-[11px] font-sans text-muted-text mt-0.5">
                Zero setup required. Ready out-of-the-box.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode("custom")}
              className={`p-3 rounded-[6px] border text-left transition-all ${
                mode === "custom"
                  ? "border-stamp-indigo bg-stamp-indigo/5 ring-1 ring-stamp-indigo"
                  : "border-fiber-line bg-paper-bg hover:bg-card-bg"
              }`}
            >
              <div className="text-xs font-bold font-display text-ink-text">Custom API Key</div>
              <div className="text-[11px] font-sans text-muted-text mt-0.5">
                Use your Groq, Gemini, or Claude key.
              </div>
            </button>
          </div>

          {mode === "custom" && (
            <div className="space-y-4 rounded-[6px] border border-fiber-line bg-paper-bg p-4">
              {/* Provider Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-muted-text">
                  Choose Provider
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["groq", "gemini", "claude"] as const).map((prov) => (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => handleProviderChange(prov)}
                      className={`py-2 px-2.5 rounded-[4px] border text-xs font-mono font-medium capitalize text-center transition-all ${
                        selectedProvider === prov
                          ? "border-stamp-indigo bg-card-bg text-ink-text font-bold shadow-sm"
                          : "border-fiber-line bg-paper-bg text-muted-text hover:text-ink-text"
                      }`}
                    >
                      {prov === "gemini" ? "Google Gemini" : prov === "claude" ? "Claude" : "Groq"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-muted-text">
                  Select Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full h-9 rounded-[4px] border border-fiber-line bg-card-bg px-3 text-xs font-mono text-ink-text focus:border-stamp-indigo focus:outline-none"
                >
                  {BYOK_MODEL_OPTIONS[selectedProvider].map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.recommended ? "(Recommended)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* API Key Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase text-muted-text">
                    API Key
                  </label>
                  <a
                    href={getProviderPortalUrl(selectedProvider)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-mono text-stamp-indigo hover:underline flex items-center gap-1"
                  >
                    Get {selectedProvider.toUpperCase()} key <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    placeholder={
                      selectedProvider === "groq"
                        ? "gsk_..."
                        : selectedProvider === "claude"
                        ? "sk-ant-..."
                        : "AIzaSy..."
                    }
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full h-9 rounded-[4px] border border-fiber-line bg-card-bg px-3 pr-10 text-xs font-mono text-ink-text placeholder:text-muted-text/50 focus:border-stamp-indigo focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-text hover:text-ink-text"
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 text-[11px] text-muted-text font-sans bg-card-bg/60 p-2.5 rounded-[4px] border border-fiber-line">
                <Info className="h-3.5 w-3.5 text-stamp-indigo shrink-0 mt-0.5" />
                <span>
                  FinChat encrypts this key with AES-256-GCM before writing to the secure server store. It is decrypted strictly in ephemeral memory when parsing ledger requests.
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setMode(isSet ? "custom" : "default");
                }}
                className="px-3.5 py-1.5 rounded-[4px] border border-fiber-line bg-paper-bg text-xs font-mono text-muted-text hover:text-ink-text transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-[4px] bg-stamp-indigo hover:bg-stamp-indigo/90 text-xs font-mono font-bold text-[#EDE7D6] transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              {mode === "default" ? "Save & Use Default" : "Save Encrypted Key"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
