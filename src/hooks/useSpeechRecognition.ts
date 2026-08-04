"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export const DEFAULT_SPEECH_LANG = "en-IN";

export interface SpeechRecognitionErrorMap {
  [key: string]: string;
}

export const SPEECH_ERROR_MESSAGES: SpeechRecognitionErrorMap = {
  "not-allowed":
    "Microphone access is blocked — check your browser's site settings to enable it.",
  "no-speech": "Didn't catch that — try again.",
  "audio-capture": "No microphone found on this device.",
  network: "Voice input needs an internet connection — try again.",
  default: "Voice input didn't work — try typing instead.",
};

export function getSpeechErrorMessage(errorType: string): string {
  return SPEECH_ERROR_MESSAGES[errorType] || SPEECH_ERROR_MESSAGES.default;
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  onFinalTranscript?: (transcript: string) => void;
  onError?: (errorMessage: string) => void;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

// Browser API Type definitions
interface ISpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: ISpeechRecognition, ev: ISpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: ISpeechRecognition, ev: ISpeechRecognitionEvent) => any) | null;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition;

export function useSpeechRecognition({
  lang = DEFAULT_SPEECH_LANG,
  onFinalTranscript,
  onError,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const finalTranscriptRef = useRef<string>("");
  const isManuallyStoppedRef = useRef<boolean>(false);

  const onFinalTranscriptRef = useRef(onFinalTranscript);
  onFinalTranscriptRef.current = onFinalTranscript;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Initialize SpeechRecognition support check on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const windowWithSpeech = window as unknown as {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      };

      const SpeechRecognitionClass =
        windowWithSpeech.SpeechRecognition ||
        windowWithSpeech.webkitSpeechRecognition;

      setIsSupported(Boolean(SpeechRecognitionClass));
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
    finalTranscriptRef.current = "";
  }, []);

  const stop = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Ignore if already stopped
      }
    }
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;

    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    const SpeechRecognitionClass =
      windowWithSpeech.SpeechRecognition ||
      windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      const msg = "Voice recognition is not supported in this browser.";
      setError(msg);
      onErrorRef.current?.(msg);
      return;
    }

    // Stop any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {
        // Ignore abort error
      }
    }

    reset();
    isManuallyStoppedRef.current = false;

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false; // Single utterance per tap
      recognition.interimResults = true; // Live transcript preview
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        let currentInterim = "";
        let currentFinal = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcriptSegment = result[0]?.transcript || "";

          if (result.isFinal) {
            currentFinal += transcriptSegment;
          } else {
            currentInterim += transcriptSegment;
          }
        }

        if (currentFinal) {
          finalTranscriptRef.current = (
            finalTranscriptRef.current + " " + currentFinal
          ).trim();
          setTranscript(finalTranscriptRef.current);
        }

        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
        const errorType = event.error || "default";
        const formattedMsg = getSpeechErrorMessage(errorType);
        setError(formattedMsg);
        setIsListening(false);
        onErrorRef.current?.(formattedMsg);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");

        const completedText = finalTranscriptRef.current.trim();
        if (completedText) {
          onFinalTranscriptRef.current?.(completedText);
        } else if (!isManuallyStoppedRef.current) {
          // If ended with no final text and not explicitly stopped by user, trigger no-speech feedback
          const emptyMsg = SPEECH_ERROR_MESSAGES["no-speech"];
          setError((prev) => prev || emptyMsg);
          onErrorRef.current?.(emptyMsg);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Speech recognition start failed:", err);
      const formattedMsg = SPEECH_ERROR_MESSAGES.default;
      setError(formattedMsg);
      setIsListening(false);
      onErrorRef.current?.(formattedMsg);
    }
  }, [lang, reset]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {
          // Ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  };
}
