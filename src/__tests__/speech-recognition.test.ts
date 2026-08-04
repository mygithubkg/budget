import {
  getSpeechErrorMessage,
  SPEECH_ERROR_MESSAGES,
  DEFAULT_SPEECH_LANG,
} from "../hooks/useSpeechRecognition";

describe("Speech Recognition Utilities and Error Mapping", () => {
  it("should have default locale set to en-IN", () => {
    expect(DEFAULT_SPEECH_LANG).toBe("en-IN");
  });

  it("should return correct error message for not-allowed", () => {
    expect(getSpeechErrorMessage("not-allowed")).toBe(
      "Microphone access is blocked — check your browser's site settings to enable it."
    );
  });

  it("should return correct error message for no-speech", () => {
    expect(getSpeechErrorMessage("no-speech")).toBe(
      "Didn't catch that — try again."
    );
  });

  it("should return correct error message for audio-capture", () => {
    expect(getSpeechErrorMessage("audio-capture")).toBe(
      "No microphone found on this device."
    );
  });

  it("should return correct error message for network", () => {
    expect(getSpeechErrorMessage("network")).toBe(
      "Voice input needs an internet connection — try again."
    );
  });

  it("should return fallback error message for any unknown error", () => {
    expect(getSpeechErrorMessage("service-not-allowed")).toBe(
      "Voice input didn't work — try typing instead."
    );
    expect(getSpeechErrorMessage("unknown-event")).toBe(
      "Voice input didn't work — try typing instead."
    );
  });
});
