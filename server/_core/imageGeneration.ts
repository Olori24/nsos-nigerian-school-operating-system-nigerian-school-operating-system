import { storagePut } from "server/storage";
import { ENV } from "./env";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{ url?: string; b64Json?: string; mimeType?: string }>;
  model?: string;
  quality?: string;
};

export type GenerateImageResponse = { url?: string };
export type ImageModelInfo = { model?: string; id?: string };
export type ListImageModelsResponse = { models: ImageModelInfo[] };

const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";
const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;

async function resolveReferenceImage(image: NonNullable<GenerateImageOptions["originalImages"]>[number]) {
  if (image.b64Json) {
    const bytes = Buffer.from(image.b64Json, "base64");
    if (!bytes.length || bytes.length > MAX_REFERENCE_IMAGE_BYTES) throw new Error("Reference image must be smaller than 10 MB.");
    return { mimeType: image.mimeType ?? "image/jpeg", data: bytes.toString("base64") };
  }
  if (!image.url) throw new Error("Reference image requires a URL or base64 data.");
  const url = new URL(image.url);
  if (url.protocol !== "https:") throw new Error("Reference image URLs must use HTTPS.");
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Reference image download failed (${response.status}).`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_REFERENCE_IMAGE_BYTES) throw new Error("Reference image must be smaller than 10 MB.");
  const mimeType = response.headers.get("content-type")?.split(";")[0] ?? image.mimeType ?? "image/jpeg";
  if (!mimeType.startsWith("image/")) throw new Error("Reference URL did not return an image.");
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
  endpoint.searchParams.set("key", ENV.geminiApiKey);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
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
  const { url } = await storagePut(`generated/${Date.now()}.${extension}`, Buffer.from(encoded, "base64"), mimeType);
  return { url };
}

export async function listImageModels(): Promise<ListImageModelsResponse> {
  if (!ENV.geminiApiKey) throw new Error("GEMINI_API_KEY is not configured.");
  return { models: [{ model: DEFAULT_IMAGE_MODEL, id: DEFAULT_IMAGE_MODEL }] };
}
