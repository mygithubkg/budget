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
          className="absolute inset-0 rounded-lg border-2 border-stamp-red bg-stamp-red/20 animate-mic-pulse motion-reduce:hidden pointer-events-none"
        />
      )}

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={isListening ? "Stop voice input" : "Start voice input"}
        title={isListening ? "Stop listening (Tap to finish)" : "Voice input (Speak to record)"}
        className={`relative flex h-11 w-11 items-center justify-center rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-stamp-red/40 disabled:opacity-40 disabled:pointer-events-none ${
          isListening
            ? "border-stamp-red bg-stamp-red/10 text-stamp-red shadow-sm"
            : "border-fiber-line bg-paper-bg text-stamp-red hover:border-stamp-red hover:bg-card-bg active:scale-95"
        }`}
      >
        {isListening ? (
          <MicOff className="h-4 w-4 text-stamp-red animate-pulse motion-reduce:animate-none" />
        ) : (
          <Mic className="h-4 w-4 text-stamp-red transition-transform hover:scale-105" />
        )}
      </button>
    </div>
  );
}
