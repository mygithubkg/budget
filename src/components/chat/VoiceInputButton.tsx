"use client";

import React from "react";
import { Mic, MicOff } from "lucide-react";

interface VoiceInputButtonProps {
  isSupported: boolean;
  isListening: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function VoiceInputButton({
  isSupported,
  isListening,
  onToggle,
  disabled = false,
}: VoiceInputButtonProps) {
  // If browser doesn't support Web Speech API, gracefully degrade by rendering nothing
  if (!isSupported) {
    return null;
  }

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      {/* Subtle pulsing ring while listening (respects prefers-reduced-motion) */}
      {isListening && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-[6px] border-2 border-rule-red bg-rule-red/20 animate-mic-pulse motion-reduce:hidden pointer-events-none"
        />
      )}

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={isListening ? "Stop voice input" : "Start voice input"}
        title={isListening ? "Stop listening (Tap to finish)" : "Voice input (Speak to record)"}
        className={`relative flex h-11 w-11 items-center justify-center rounded-[6px] border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-stamp-indigo/40 disabled:opacity-40 disabled:pointer-events-none ${
          isListening
            ? "border-rule-red bg-rule-red/10 text-rule-red shadow-sm"
            : "border-fiber-line bg-paper-bg text-stamp-indigo hover:border-stamp-indigo hover:bg-card-bg active:scale-95"
        }`}
      >
        {isListening ? (
          <MicOff className="h-4 w-4 text-rule-red animate-pulse motion-reduce:animate-none" />
        ) : (
          <Mic className="h-4 w-4 text-stamp-indigo transition-transform hover:scale-105" />
        )}
      </button>
    </div>
  );
}
