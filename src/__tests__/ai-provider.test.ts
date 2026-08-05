import { BYOKError, BYOK_MODEL_OPTIONS } from "@/lib/ai/aiProvider";

describe("AI Provider Abstraction & BYOK", () => {
  test("BYOK_MODEL_OPTIONS contains valid models for all 3 supported providers", () => {
    expect(BYOK_MODEL_OPTIONS.groq.length).toBeGreaterThan(0);
    expect(BYOK_MODEL_OPTIONS.gemini.length).toBeGreaterThan(0);
    expect(BYOK_MODEL_OPTIONS.claude.length).toBeGreaterThan(0);

    // Each provider has at least one recommended model
    expect(BYOK_MODEL_OPTIONS.groq.some((m) => m.recommended)).toBe(true);
    expect(BYOK_MODEL_OPTIONS.gemini.some((m) => m.recommended)).toBe(true);
    expect(BYOK_MODEL_OPTIONS.claude.some((m) => m.recommended)).toBe(true);
  });

  test("BYOKError correctly constructs human-friendly messages", () => {
    const error401 = new BYOKError(
      "groq",
      "Authentication error",
      401,
      "Your personal Groq API key was rejected. Please verify the key in Settings."
    );

    expect(error401.provider).toBe("groq");
    expect(error401.statusCode).toBe(401);
    expect(error401.userFriendlyMessage).toContain("personal Groq API key was rejected");
    expect(error401.name).toBe("BYOKError");
  });
});
