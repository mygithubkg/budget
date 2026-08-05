export interface AIProviderModel {
  id: string;
  name: string;
  recommended?: boolean;
}

export interface AIProviderConfig {
  provider: "groq" | "gemini" | "claude";
  model: string;
  isSet: boolean;
  last4?: string;
}

export const BYOK_MODEL_OPTIONS: Record<"groq" | "gemini" | "claude", AIProviderModel[]> = {
  groq: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile", recommended: true },
    { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B", recommended: false },
    { id: "openai/gpt-oss-20b", name: "GPT-OSS 20B", recommended: false },
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", recommended: false },
  ],
  gemini: [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", recommended: true },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", recommended: false },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", recommended: false },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", recommended: false },
  ],
  claude: [
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", recommended: true },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", recommended: false },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus", recommended: false },
  ],
};
