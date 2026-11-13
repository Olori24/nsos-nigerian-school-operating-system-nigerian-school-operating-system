import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

let client: S3Client | undefined;

function getStorage() {
  if (!ENV.s3Bucket || !ENV.s3AccessKeyId || !ENV.s3SecretAccessKey) {
    throw new Error("S3 storage is not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.");
  }
  client ??= new S3Client({
    region: ENV.s3Region,
    ...(ENV.s3Endpoint ? { endpoint: ENV.s3Endpoint, forcePathStyle: true } : {}),
    credentials: { accessKeyId: ENV.s3AccessKeyId, secretAccessKey: ENV.s3SecretAccessKey },
  });
  return { client, bucket: ENV.s3Bucket };
}

function normalizeKey(value: string) {
  const key = value.replace(/^\/+/, "").replace(/\\/g, "/");
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
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: Math.min(Math.max(expiresIn, 60), 3600),
  });
}
