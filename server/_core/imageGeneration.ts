import { storageGetSignedUrl, storagePut } from "server/storage";
import { ENV } from "./env";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{ b64Json: string; mimeType?: string }>;
  model?: string;
  quality?: string;
};

export type GenerateImageResponse = { url?: string; key?: string };
export type ImageModelInfo = { model?: string; id?: string };
export type ListImageModelsResponse = { models: ImageModelInfo[] };

const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";
const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;

async function resolveReferenceImage(image: NonNullable<GenerateImageOptions["originalImages"]>[number]) {
  if (!image.b64Json) {
    throw new Error("Reference images must be supplied as base64 data. Remote image URLs are not fetched.");
  }
  const bytes = Buffer.from(image.b64Json, "base64");
  if (!bytes.length || bytes.length > MAX_REFERENCE_IMAGE_BYTES) throw new Error("Reference image must be smaller than 10 MB.");
  const mimeType = image.mimeType ?? "image/jpeg";
  if (!mimeType.startsWith("image/")) throw new Error("Reference image must use an image MIME type.");
  return { mimeType, data: bytes.toString("base64") };
}

export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  if (!ENV.geminiApiKey) throw new Error("GEMINI_API_KEY is not configured.");
  if (!options.prompt?.trim() || options.prompt.length > 8000) throw new Error("Image prompt must contain 1 to 8,000 characters.");

  const parts: Array<Record<string, unknown>> = [{ text: options.prompt.trim() }];
  for (const image of options.originalImages ?? []) {
    const resolved = await resolveReferenceImage(image);
    parts.push({ inline_data: { mime_type: resolved.mimeType, data: resolved.data } });
  }

  const model = options.model ?? DEFAULT_IMAGE_MODEL;
  const endpoint = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": ENV.geminiApiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Gemini image generation failed (${response.status}): ${detail.slice(0, 1200)}`);
  }

  const result = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string; inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } }> } }>;
  };
  const imagePart = result.candidates?.flatMap(candidate => candidate.content?.parts ?? []).find(part => part.inlineData?.data || part.inline_data?.data);
  const encoded = imagePart?.inlineData?.data ?? imagePart?.inline_data?.data;
  const mimeType = imagePart?.inlineData?.mimeType ?? imagePart?.inline_data?.mime_type ?? "image/png";
  if (!encoded) throw new Error("Gemini returned no image data.");
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/webp" ? "webp" : "png";
  const stored = await storagePut(`generated/${Date.now()}.${extension}`, Buffer.from(encoded, "base64"), mimeType);
  const url = await storageGetSignedUrl(stored.key);
  return { url, key: stored.key };
}

export async function listImageModels(): Promise<ListImageModelsResponse> {
  if (!ENV.geminiApiKey) throw new Error("GEMINI_API_KEY is not configured.");
  return { models: [{ model: DEFAULT_IMAGE_MODEL, id: DEFAULT_IMAGE_MODEL }] };
}
