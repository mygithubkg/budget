import { adminDb } from "@/lib/firebase/admin";
import { decryptSecret } from "@/lib/encryption";
import { callGroqWithFallback } from "@/lib/groqFallback";
import { chatApiResponseSchema, ChatApiResponse } from "@/lib/validations";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

import { AIProviderConfig, BYOK_MODEL_OPTIONS } from "./constants";
export { BYOK_MODEL_OPTIONS };
export type { AIProviderConfig };

export class BYOKError extends Error {
  public provider: string;
  public statusCode?: number;
  public userFriendlyMessage: string;

  constructor(
    provider: string,
    originalMessage: string,
    statusCode?: number,
    customUserMessage?: string
  ) {
    const providerName =
      provider === "groq"
        ? "Groq"
        : provider === "gemini"
        ? "Google Gemini"
        : provider === "claude"
        ? "Anthropic Claude"
        : provider;

    let cleanMsg = originalMessage;
    if (originalMessage.includes("401") || originalMessage.toLowerCase().includes("invalid api key")) {
      cleanMsg = "Invalid API key provided";
    } else if (originalMessage.includes("429") || originalMessage.toLowerCase().includes("rate limit")) {
      cleanMsg = "Rate limit or quota exceeded";
    } else if (originalMessage.toLowerCase().includes("credit") || originalMessage.toLowerCase().includes("balance")) {
      cleanMsg = "Insufficient API credit balance";
    }

    const userFriendlyMessage =
      customUserMessage ||
      `Your ${providerName} key hit an issue: ${cleanMsg}. Check it in Settings, or switch back to FinChat's default.`;

    super(userFriendlyMessage);
    this.name = "BYOKError";
    this.provider = provider;
    this.statusCode = statusCode;
    this.userFriendlyMessage = userFriendlyMessage;
  }
}

/**
 * Clean and parse json response string
 */
function cleanAndParseJSON(rawText: string): any {
  let cleaned = rawText.trim();
  // Strip code fences if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleaned);
}

/**
 * Call Groq with user's personal key & chosen model
 */
async function callGroqBYOK(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  history: { role: string; content: string }[]
): Promise<string> {
  const client = new Groq({ apiKey });

  const messages: any[] = [{ role: "system", content: systemPrompt }];
  history.slice(-4).forEach((h) => {
    messages.push({
      role: h.role === "assistant" ? "assistant" : "user",
      content: h.content,
    });
  });
  messages.push({ role: "user", content: userMessage });

  const res = await client.chat.completions.create({
    model: model || "llama-3.3-70b-versatile",
    messages,
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  return res.choices[0]?.message?.content || "";
}

/**
 * Call Gemini with user's personal key & chosen model
 */
async function callGeminiBYOK(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  history: { role: string; content: string }[]
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({
    model: model || "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
    systemInstruction: systemPrompt,
  });

  // Construct contents including conversation history
  const contents: any[] = [];
  history.slice(-4).forEach((h) => {
    contents.push({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    });
  });
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  const response = await geminiModel.generateContent({ contents });
  return response.response.text();
}

/**
 * Call Claude with user's personal key & chosen model
 */
async function callClaudeBYOK(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  history: { role: string; content: string }[]
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });

  const messages: any[] = [];
  history.slice(-4).forEach((h) => {
    messages.push({
      role: h.role === "assistant" ? "assistant" : "user",
      content: h.content,
    });
  });
  messages.push({ role: "user", content: userMessage });

  const res = await anthropic.messages.create({
    model: model || "claude-3-5-sonnet-20241022",
    max_tokens: 2048,
    temperature: 0.1,
    system: `${systemPrompt}\n\nIMPORTANT: Respond with ONLY a valid JSON object. No explanation, no markdown ticks.`,
    messages,
  });

  const contentBlock = res.content[0];
  if (contentBlock && contentBlock.type === "text") {
    return contentBlock.text;
  }
  return "";
}

export { cleanAndParseJSON };

/**
 * Universal raw completion router supporting BYOK and FinChat default fallback.
 */
export async function getRawAICompletion(
  uid: string,
  systemPrompt: string,
  userMessage: string,
  conversationHistory: { role: string; content: string }[] = []
): Promise<{
  content: string;
  modelUsed: string;
  isBYOK: boolean;
}> {
  // 1. Check for BYOK config in Firestore
  let byokDoc: any = null;
  try {
    const snap = await adminDb
      .collection("users")
      .doc(uid)
      .collection("private")
      .doc("aiConfig")
      .get();
    if (snap.exists && snap.data()?.isSet) {
      byokDoc = snap.data();
    }
  } catch (err) {
    console.warn("Could not read private AI config, falling back to default chain:", err);
  }

  // 2. If BYOK is configured, execute isolated provider adapter
  if (byokDoc && byokDoc.encryptedKey && byokDoc.iv && byokDoc.authTag) {
    const { provider, model, encryptedKey, iv, authTag } = byokDoc;
    let apiKey: string;

    try {
      apiKey = decryptSecret(encryptedKey, iv, authTag);
    } catch (decryptErr: any) {
      throw new BYOKError(provider, "Could not decrypt stored API key. Please re-enter your key in Settings.");
    }

    try {
      let rawResponse = "";
      if (provider === "groq") {
        rawResponse = await callGroqBYOK(apiKey, model, systemPrompt, userMessage, conversationHistory);
      } else if (provider === "gemini") {
        rawResponse = await callGeminiBYOK(apiKey, model, systemPrompt, userMessage, conversationHistory);
      } else if (provider === "claude") {
        rawResponse = await callClaudeBYOK(apiKey, model, systemPrompt, userMessage, conversationHistory);
      } else {
        throw new Error(`Unsupported AI provider: ${provider}`);
      }

      return {
        content: rawResponse,
        modelUsed: `${provider}:${model}`,
        isBYOK: true,
      };
    } catch (providerErr: any) {
      console.error(`BYOK ${provider} error for user ${uid}:`, providerErr);
      throw new BYOKError(provider, providerErr.message || "Request failed");
    }
  }

  // 3. FinChat Default: Groq Fallback Chain
  const groqMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
  ];

  if (conversationHistory.length > 0) {
    conversationHistory.slice(-4).forEach((h) => {
      groqMessages.push({
        role: h.role === "assistant" ? "assistant" : "user",
        content: h.content,
      });
    });
  }
  groqMessages.push({ role: "user", content: userMessage });

  const fallbackResult = await callGroqWithFallback({
    messages: groqMessages,
    temperature: 0.1,
    responseFormat: { type: "json_object" },
  });

  return {
    content: fallbackResult.content,
    modelUsed: fallbackResult.modelUsed,
    isBYOK: false,
  };
}

/**
 * High-level AI response router for expense chat processing.
 */
export async function getAIResponse(
  uid: string,
  systemPrompt: string,
  userMessage: string,
  conversationHistory: { role: string; content: string }[] = [],
  options?: { categoryList?: string[]; friendList?: string[]; todayDate?: string }
): Promise<{
  result: ChatApiResponse;
  modelUsed: string;
  isBYOK: boolean;
}> {
  const completion = await getRawAICompletion(uid, systemPrompt, userMessage, conversationHistory);
  const parsedJSON = cleanAndParseJSON(completion.content);
  const validated = chatApiResponseSchema.parse(parsedJSON);

  return {
    result: validated,
    modelUsed: completion.modelUsed,
    isBYOK: completion.isBYOK,
  };
}

/**
 * Dedicated Vision AI Completion router for receipt photo processing.
 * Routes to user's BYOK Gemini/Claude if configured, or Groq's qwen/qwen3.6-27b by default.
 */
export async function getVisionAICompletion(
  uid: string,
  systemPrompt: string,
  imageBase64DataUrl: string
): Promise<{
  content: string;
  modelUsed: string;
  isBYOK: boolean;
}> {
  // 1. Check for BYOK config in Firestore
  let byokDoc: any = null;
  try {
    const snap = await adminDb
      .collection("users")
      .doc(uid)
      .collection("private")
      .doc("aiConfig")
      .get();
    if (snap.exists && snap.data()?.isSet) {
      byokDoc = snap.data();
    }
  } catch (err) {
    console.warn("Could not read private AI config for vision:", err);
  }

  const rawBase64 = imageBase64DataUrl.includes(",")
    ? imageBase64DataUrl.split(",")[1]
    : imageBase64DataUrl;

  // 2. If BYOK is configured and supports vision (Gemini / Claude / Groq)
  if (byokDoc && byokDoc.encryptedKey && byokDoc.iv && byokDoc.authTag) {
    const { provider, model, encryptedKey, iv, authTag } = byokDoc;
    let apiKey: string;
    try {
      apiKey = decryptSecret(encryptedKey, iv, authTag);
    } catch (decryptErr) {
      throw new BYOKError(provider, "Could not decrypt stored API key. Please re-enter your key in Settings.");
    }

    try {
      if (provider === "gemini") {
        const genAI = new GoogleGenerativeAI(apiKey);
        const visionModel = genAI.getGenerativeModel({ model: model || "gemini-2.0-flash" });
        const result = await visionModel.generateContent([
          systemPrompt,
          {
            inlineData: {
              data: rawBase64,
              mimeType: "image/jpeg",
            },
          },
        ]);
        return {
          content: result.response.text(),
          modelUsed: `gemini:${model || "gemini-2.0-flash"}`,
          isBYOK: true,
        };
      }

      if (provider === "claude") {
        const anthropic = new Anthropic({ apiKey });
        const message = await anthropic.messages.create({
          model: model || "claude-3-5-sonnet-20241022",
          max_tokens: 2048,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: rawBase64,
                  },
                },
                {
                  type: "text",
                  text: "Please extract line items from this receipt according to the system prompt instructions.",
                },
              ],
            },
          ],
        });
        const content =
          message.content[0]?.type === "text" ? message.content[0].text : "";
        return {
          content,
          modelUsed: `claude:${model || "claude-3-5-sonnet-20241022"}`,
          isBYOK: true,
        };
      }

      if (provider === "groq") {
        const groqClient = new Groq({ apiKey });
        const completion = await groqClient.chat.completions.create({
          model: "qwen/qwen3.6-27b",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: imageBase64DataUrl },
                },
                {
                  type: "text",
                  text: "Extract receipt line items into the specified JSON format.",
                },
              ],
            },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
        });
        return {
          content: completion.choices[0]?.message?.content || "{}",
          modelUsed: "groq:qwen/qwen3.6-27b",
          isBYOK: true,
        };
      }
    } catch (err: any) {
      console.error(`BYOK Vision error (${provider}):`, err);
      throw new BYOKError(provider, err.message || "Vision processing failed");
    }
  }

  // 3. Default FinChat Vision: Groq qwen/qwen3.6-27b
  try {
    const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groqClient.chat.completions.create({
      model: "qwen/qwen3.6-27b",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageBase64DataUrl },
            },
            {
              type: "text",
              text: "Extract line items from this receipt photo into JSON.",
            },
          ],
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    return {
      content: completion.choices[0]?.message?.content || "{}",
      modelUsed: "groq:qwen/qwen3.6-27b",
      isBYOK: false,
    };
  } catch (err: any) {
    console.error("Default vision Groq error:", err);
    throw new Error(
      "The receipt scanner is temporarily busy. Please try again in a moment or configure a Gemini/Claude key in Settings."
    );
  }
}

