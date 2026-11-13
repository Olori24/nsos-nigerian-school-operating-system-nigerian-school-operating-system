import { ENV } from "./env";

export type TranscribeOptions = { audioUrl: string; language?: string; prompt?: string };
export type WhisperSegment = {
  id: number; seek: number; start: number; end: number; text: string; tokens: number[];
  temperature: number; avg_logprob: number; compression_ratio: number; no_speech_prob: number;
};
export type WhisperResponse = {
  task: "transcribe"; language: string; duration: number; text: string; segments: WhisperSegment[];
};
export type TranscriptionResponse = WhisperResponse;
export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "UPLOAD_FAILED" | "SERVICE_ERROR";
  details?: string;
};

const MAX_AUDIO_BYTES = 16 * 1024 * 1024;

export async function transcribeAudio(options: TranscribeOptions): Promise<TranscriptionResponse | TranscriptionError> {
  try {
    if (!ENV.geminiApiKey) return { error: "Voice transcription is not configured", code: "SERVICE_ERROR", details: "GEMINI_API_KEY is not set." };
    const audioUrl = new URL(options.audioUrl);
    if (audioUrl.protocol !== "https:" || audioUrl.username || audioUrl.password) {
      return { error: "Invalid audio URL", code: "INVALID_FORMAT", details: "Audio must be served from an HTTPS URL." };
    }
    const audioResponse = await fetch(audioUrl, { signal: AbortSignal.timeout(20_000) });
    if (!audioResponse.ok) return { error: "Failed to download audio file", code: "INVALID_FORMAT", details: `HTTP ${audioResponse.status}` };
    const mimeType = (audioResponse.headers.get("content-type") ?? "audio/webm").split(";")[0];
    if (!mimeType.startsWith("audio/")) return { error: "Unsupported audio format", code: "INVALID_FORMAT", details: `Received ${mimeType}` };
    const audio = Buffer.from(await audioResponse.arrayBuffer());
    if (!audio.length) return { error: "Audio file is empty", code: "INVALID_FORMAT" };
    if (audio.length > MAX_AUDIO_BYTES) return { error: "Audio file exceeds 16 MB", code: "FILE_TOO_LARGE" };

    const instruction = [
      "Transcribe the supplied audio accurately.",
      options.language ? `The expected language is ${options.language}; preserve the original language.` : "Detect the spoken language.",
      options.prompt?.trim() ? `Additional context: ${options.prompt.trim().slice(0, 1500)}` : "",
      "Return only the transcription text, without commentary.",
    ].filter(Boolean).join(" ");

    const endpoint = new URL("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent");
    endpoint.searchParams.set("key", ENV.geminiApiKey);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [
          { text: instruction },
          { inline_data: { mime_type: mimeType, data: audio.toString("base64") } },
        ] }],
        generationConfig: { temperature: 0 },
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { error: "Gemini transcription request failed", code: "TRANSCRIPTION_FAILED", details: `${response.status}: ${detail.slice(0, 1000)}` };
    }
    const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = result.candidates?.flatMap(candidate => candidate.content?.parts ?? []).map(part => part.text ?? "").join("").trim();
    if (!text) return { error: "Gemini returned an empty transcription", code: "SERVICE_ERROR" };
    return { task: "transcribe", language: options.language ?? "und", duration: 0, text, segments: [] };
  } catch (error) {
    return { error: "Voice transcription failed", code: "SERVICE_ERROR", details: error instanceof Error ? error.message : "Unexpected error" };
  }
}
