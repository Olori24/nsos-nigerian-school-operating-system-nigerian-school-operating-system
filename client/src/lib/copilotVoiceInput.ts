export type VoiceResult = { isFinal: boolean; transcript: string };

export function speechTranscript(results: VoiceResult[]) {
  return results.map(result => result.transcript.trim()).filter(Boolean).join(" ").trim();
}

export function voiceInputErrorMessage(code: string) {
  if (code === "not-allowed" || code === "service-not-allowed") return "Microphone access was not allowed. You can continue by typing your request.";
  if (code === "no-speech") return "No speech was detected. Try again or type your request.";
  if (code === "audio-capture") return "No microphone was found. Check your device audio settings or type your request.";
  if (code === "network") return "Speech transcription is temporarily unavailable. Please type your request.";
  return "Voice input could not start. Please type your request instead.";
}

export function supportsBrowserSpeechRecognition(candidate: unknown) {
  return typeof candidate === "function";
}
