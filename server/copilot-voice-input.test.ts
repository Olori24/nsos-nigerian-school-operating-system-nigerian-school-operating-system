import { describe, expect, it } from "vitest";
import { canAutoSubmitVoiceTranscript, speechTranscript, supportsBrowserSpeechRecognition, VOICE_AUTO_SUBMIT_DELAY_MS, voiceInputErrorMessage } from "../client/src/lib/copilotVoiceInput";

describe("Copilot voice input helpers", () => {
  it("combines non-empty speech results into an editable transcript", () => {
    expect(speechTranscript([{ isFinal: false, transcript: "Where do" }, { isFinal: true, transcript: "I record attendance?" }, { isFinal: true, transcript: "" }])).toBe("Where do I record attendance?");
  });

  it("reports browser availability and gives a safe typed-input fallback for microphone errors", () => {
    expect(supportsBrowserSpeechRecognition(() => undefined)).toBe(true);
    expect(supportsBrowserSpeechRecognition(undefined)).toBe(false);
    expect(voiceInputErrorMessage("not-allowed")).toContain("Microphone access");
    expect(voiceInputErrorMessage("network")).toContain("type your request");
  });

  it("requires a meaningful transcript before speech-end auto-submit and keeps a short cancellation window", () => {
    expect(canAutoSubmitVoiceTranscript(" ")).toBe(false);
    expect(canAutoSubmitVoiceTranscript("a")).toBe(false);
    expect(canAutoSubmitVoiceTranscript("Show my fees")).toBe(true);
    expect(VOICE_AUTO_SUBMIT_DELAY_MS).toBe(1500);
  });
});
