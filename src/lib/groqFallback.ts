import { groq } from "@/lib/groq";
import { getModelPriorityList } from "@/lib/groqModels";
import { adminDb } from "@/lib/firebase/admin";
import * as admin from "firebase-admin";

// In-memory fallback cache for fast lookups & serverless warmth
const inMemoryCooldowns = new Map<string, number>();

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CallGroqOptions {
  messages: GroqMessage[];
  temperature?: number;
  responseFormat?: { type: "json_object" | "text" };
}

export interface GroqFallbackResult {
  content: string;
  modelUsed: string;
}

/**
 * Check if a model is currently in a rate-limit cooldown
 */
async function isModelRateLimited(modelId: string): Promise<boolean> {
  const now = Date.now();
  const docId = modelId.replace(/[\/\.]/g, "__");

  // 1. Fast in-memory check
  const memExpiry = inMemoryCooldowns.get(modelId);
  if (memExpiry && memExpiry > now) {
    return true;
  }

  // 2. Distributed Firestore check
  try {
    const docRef = adminDb.collection("system").doc("groqModelStatus").collection("models").doc(docId);
    const snap = await docRef.get();
    if (snap.exists) {
      const data = snap.data();
      const rateLimitedUntil = data?.rateLimitedUntil;
      if (rateLimitedUntil) {
        const expiryMs =
          rateLimitedUntil instanceof admin.firestore.Timestamp
            ? rateLimitedUntil.toMillis()
            : new Date(rateLimitedUntil).getTime();

        if (expiryMs > now) {
          inMemoryCooldowns.set(modelId, expiryMs);
          return true;
        }
      }
    }
  } catch (err) {
    // Non-blocking fallback if Firestore admin is unavailable
  }

  return false;
}

/**
 * Record a model's rate-limit cooldown across Firestore and in-memory cache
 */
async function markModelRateLimited(
  modelId: string,
  cooldownSeconds: number = 60,
  errorMessage: string = "Rate limit exceeded"
) {
  const now = Date.now();
  const expiryMs = now + cooldownSeconds * 1000;
  const docId = modelId.replace(/[\/\.]/g, "__");

  inMemoryCooldowns.set(modelId, expiryMs);

  try {
    const docRef = adminDb.collection("system").doc("groqModelStatus").collection("models").doc(docId);
    await docRef.set(
      {
        modelId,
        rateLimitedUntil: admin.firestore.Timestamp.fromMillis(expiryMs),
        lastUsed: admin.firestore.Timestamp.now(),
        lastError: errorMessage,
      },
      { merge: true }
    );
  } catch (err) {
    // Non-blocking log
    console.warn(`Could not persist cooldown to Firestore for ${modelId}:`, err);
  }
}

/**
 * Record successful model execution
 */
async function markModelSuccess(modelId: string) {
  const docId = modelId.replace(/[\/\.]/g, "__");
  inMemoryCooldowns.delete(modelId);

  try {
    const docRef = adminDb.collection("system").doc("groqModelStatus").collection("models").doc(docId);
    await docRef.set(
      {
        modelId,
        rateLimitedUntil: null,
        lastUsed: admin.firestore.Timestamp.now(),
        lastError: null,
      },
      { merge: true }
    );
  } catch (err) {
    // Non-blocking
  }
}

/**
 * Call Groq with automatic multi-model fallback chain
 */
export async function callGroqWithFallback(
  options: CallGroqOptions
): Promise<GroqFallbackResult> {
  const models = getModelPriorityList();
  const errors: { model: string; error: any }[] = [];

  for (const model of models) {
    // 1. Check cooldown store
    const isLimited = await isModelRateLimited(model);
    if (isLimited) {
      console.warn(`[GroqFallback] Skipping ${model} due to active rate-limit cooldown.`);
      continue;
    }

    try {
      console.log(`[GroqFallback] Attempting inference with model: ${model}`);
      const completion = await groq.chat.completions.create({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.1,
        response_format: options.responseFormat ?? { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content?.trim() || "";

      if (content) {
        // Successful call!
        markModelSuccess(model).catch(() => {});
        console.log(`[GroqFallback] Successfully processed request with model: ${model}`);
        return {
          content,
          modelUsed: model,
        };
      }
    } catch (err: any) {
      console.error(`[GroqFallback] Error with model ${model}:`, err?.message || err);
      errors.push({ model, error: err });

      const status = err?.status || err?.statusCode;
      const errMsg = String(err?.message || "").toLowerCase();
      const isRateLimit =
        status === 429 ||
        errMsg.includes("rate limit") ||
        errMsg.includes("rate_limit_exceeded") ||
        err?.code === "rate_limit_exceeded";

      if (isRateLimit) {
        // Try reading Retry-After header
        let retryAfterSec = 60;
        const retryHeader = err?.headers?.get?.("retry-after") || err?.response?.headers?.get?.("retry-after");
        if (retryHeader) {
          const parsed = parseInt(retryHeader, 10);
          if (!isNaN(parsed) && parsed > 0) {
            retryAfterSec = parsed;
          }
        }

        console.warn(
          `[GroqFallback] Model ${model} rate limited. Setting cooldown for ${retryAfterSec}s and cascading to next model.`
        );
        await markModelRateLimited(model, retryAfterSec, err.message);
      } else {
        // If not rate limit (e.g. 404 deprecated or 500), briefly cooldown to avoid immediate re-hit
        await markModelRateLimited(model, 30, err.message);
      }

      // Continue to next model in loop
      continue;
    }
  }

  // If every single model was exhausted or failed
  throw new Error(
    "ALL_MODELS_RATE_LIMITED: All Groq models in the fallback priority chain are currently rate limited or unavailable."
  );
}
