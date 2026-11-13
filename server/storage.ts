import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import { ENV } from "./_core/env";

let client: S3Client | undefined;
const STORAGE_REQUEST_TIMEOUT_MS = 10_000;

function validateS3Endpoint(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const trustedHost =
    /^[a-f0-9]{32}\\.r2\\.cloudflarestorage\\.com$/.test(host) ||
    host === "s3.amazonaws.com" ||
    /^s3[.-][a-z0-9-]+\\.amazonaws\\.com$/.test(host);
  if (url.protocol !== "https:" || !trustedHost || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("S3_ENDPOINT must be a trusted HTTPS Cloudflare R2 or AWS S3 endpoint.");
  }
  return url.origin;
}

function getStorage() {
  if (!ENV.s3Bucket || !ENV.s3AccessKeyId || !ENV.s3SecretAccessKey) {
    throw new Error("S3 storage is not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.");
  }
  client ??= new S3Client({
    region: ENV.s3Region,
    ...(ENV.s3Endpoint ? { endpoint: validateS3Endpoint(ENV.s3Endpoint), forcePathStyle: true } : {}),
    credentials: { accessKeyId: ENV.s3AccessKeyId, secretAccessKey: ENV.s3SecretAccessKey },
  });
  return { client, bucket: ENV.s3Bucket };
}

function normalizeKey(value: string) {
  const key = value.replace(/^\\/+/, "").replace(/\\\\/g, "/");
  if (!key || key.split("/").some(part => !part || part === "." || part === "..") || key.length > 900) {
    throw new Error("Invalid storage key.");
  }
  return key;
}

function appendHashSuffix(key: string) {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const dot = key.lastIndexOf(".");
  return dot > key.lastIndexOf("/") ? `${key.slice(0, dot)}_${suffix}${key.slice(dot)}` : `${key}_${suffix}`;
}

const publicPath = (key: string) => `/api/storage/${key.split("/").map(encodeURIComponent).join("/")}`;

function isMissingObjectError(error: unknown) {
  const value = error as { name?: string; Code?: string; code?: string; $metadata?: { httpStatusCode?: number } };
  return value?.$metadata?.httpStatusCode === 404 || ["NoSuchKey", "NotFound", "404"].includes(value?.name ?? value?.Code ?? value?.code ?? "");
}

function legacyForgeBaseUrl() {
  if (!ENV.legacyForgeApiUrl || !ENV.legacyForgeApiKey) return null;
  const url = new URL(ENV.legacyForgeApiUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("LEGACY_STORAGE_FORGE_API_URL must be a trusted HTTPS URL.");
  }
  return url.toString().replace(/\\/+$/, "");
}

async function getLegacyForgeSignedUrl(key: string) {
  const forgeUrl = legacyForgeBaseUrl();
  if (!forgeUrl) return null;
  const presignUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const response = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${ENV.legacyForgeApiKey}` },
    signal: AbortSignal.timeout(STORAGE_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Legacy storage read authorization failed (${response.status}).`);
  const payload = await response.json().catch(() => ({})) as { url?: unknown };
  if (typeof payload.url !== "string") throw new Error("Legacy storage provider returned an invalid download URL.");
  const signedUrl = new URL(payload.url);
  const trustedHost = signedUrl.hostname === "s3.amazonaws.com" ||
    signedUrl.hostname.endsWith(".amazonaws.com") ||
    /^[a-f0-9]{32}\\.r2\\.cloudflarestorage\\.com$/.test(signedUrl.hostname);
  if (signedUrl.protocol !== "https:" || !trustedHost || signedUrl.username || signedUrl.password) {
    throw new Error("Legacy storage provider returned an untrusted download URL.");
  }
  return signedUrl.toString();
}

async function getLegacyObject(key: string) {
  const signedUrl = await getLegacyForgeSignedUrl(key);
  if (!signedUrl) return null;
  const response = await fetch(signedUrl, { signal: AbortSignal.timeout(STORAGE_REQUEST_TIMEOUT_MS), redirect: "error" });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Legacy object download failed (${response.status}).`);
  }
  if (!response.body) return null;
  const contentLength = Number(response.headers.get("content-length"));
  return {
    Body: Readable.fromWeb(response.body as any),
    ContentType: response.headers.get("content-type") ?? "application/octet-stream",
    ...(Number.isFinite(contentLength) && contentLength >= 0 ? { ContentLength: contentLength } : {}),
  };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const { client: s3, bucket } = getStorage();
  const key = appendHashSuffix(normalizeKey(relKey));
  const body = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  return { key, url: publicPath(key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: publicPath(key) };
}

export async function storageGetSignedUrl(relKey: string, expiresIn = 900): Promise<string> {
  const { client: s3, bucket } = getStorage();
  const key = normalizeKey(relKey);
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: Math.min(Math.max(expiresIn, 60), 3600),
    });
  } catch (error) {
    if (!isMissingObjectError(error)) throw error;
    const legacyUrl = await getLegacyForgeSignedUrl(key);
    if (legacyUrl) return legacyUrl;
    throw error;
  }
}

export async function storageGetObject(relKey: string) {
  const { client: s3, bucket } = getStorage();
  const key = normalizeKey(relKey);
  try {
    return await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    if (!isMissingObjectError(error)) throw error;
    const legacyObject = await getLegacyObject(key);
    if (legacyObject) return legacyObject;
    throw error;
  }
}
