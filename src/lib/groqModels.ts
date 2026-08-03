/**
 * Groq Model Priority List
 * Models are tried in sequence when rate limits (429) occur.
 * Each model on Groq maintains its own independent rate-limit bucket.
 */

export interface GroqModelConfig {
  id: string;
  name: string;
  description: string;
  contextWindow?: number;
}

export const DEFAULT_GROQ_MODEL_PRIORITY: GroqModelConfig[] = [
  {
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
    description: "Flagship quality, strong structured output support",
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT OSS 20B",
    description: "Fast, high throughput, capable structured extraction",
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B Versatile",
    description: "High accuracy general reasoning & JSON extraction",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant",
    description: "Ultra-fast low-latency fallback",
  },
  {
    id: "groq/compound-mini",
    name: "Groq Compound Mini",
    description: "Agentic system fallback",
  },
  {
    id: "groq/compound",
    name: "Groq Compound",
    description: "Full agentic system fallback",
  },
  {
    id: "qwen/qwen3.6-27b",
    name: "Qwen 3.6 27B",
    description: "Preview tier emergency fallback",
  },
];

/**
 * Get configured model priority list, allowing custom overrides via environment variable
 */
export function getModelPriorityList(): string[] {
  if (process.env.GROQ_MODEL_PRIORITY) {
    try {
      const parsed = JSON.parse(process.env.GROQ_MODEL_PRIORITY);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      const split = process.env.GROQ_MODEL_PRIORITY.split(",").map((s) => s.trim());
      if (split.length > 0) return split;
    }
  }

  return DEFAULT_GROQ_MODEL_PRIORITY.map((m) => m.id);
}
