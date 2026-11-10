import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

type StorageProvider = "forge" | "s3" | "dual";

let s3Client: S3Client | null = null;

function storageProvider(): StorageProvider {
  if (ENV.storageProvider === "forge" || ENV.storageProvider === "s3" || ENV.storageProvider === "dual") {
    return ENV.storageProvider;
  }
  throw new Error("STORAGE_PROVIDER must be forge, s3, or dual.");
}

function normalizeKey(relKey: string): string {
  const key = relKey.replace(/^\/+/, "");
  if (
    !key ||
    key.length > 1024 ||
    key.includes("\\") ||
    !/^[A-Za-z0-9._/-]+$/.test(key) ||
    key.split("/").some(part => !part || part === "." || part === "..")
  ) {
    throw new Error("Storage object key is invalid.");
  }
  return key;
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return relKey + "_" + hash;
  return relKey.slice(0, lastDot) + "_" + hash + relKey.slice(lastDot);
}

function getS3Config() {
  const bucket = ENV.s3Bucket.trim();
  const accessKeyId = ENV.s3AccessKeyId.trim();
  const secretAccessKey = ENV.s3SecretAccessKey;
  const region = ENV.s3Region.trim();
  const endpoint = ENV.s3Endpoint.trim();

  if (!bucket || !accessKeyId || !secretAccessKey || !region) {
    throw new Error(
      "S3 storage requires S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_REGION.",
    );
  }

  if (endpoint) {
    let parsed: URL;
    try {
      parsed = new URL(endpoint);
    } catch {
      throw new Error("S3_ENDPOINT must be a valid URL.");
    }
    const localHttp = !ENV.isProduction && parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
    if (parsed.protocol !== "https:" && !localHttp) {
      throw new Error("S3_ENDPOINT must use HTTPS outside local development.");
    }
    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new Error("S3_ENDPOINT must not contain credentials, a query, or a fragment.");
    }
  }

  return { bucket, accessKeyId, secretAccessKey, region, endpoint: endpoint || undefined };
}

function getS3Client() {
  const config = getS3Config();
  s3Client ??= new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: ENV.s3ForcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return { client: s3Client, bucket: config.bucket };
}

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Legacy storage requires BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY.",
    );
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

async function forgePut(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
) {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResponse = await fetch(presignUrl, {
    headers: { Authorization: "Bearer " + forgeKey },
    signal: AbortSignal.timeout(30_000),
  });
  if (!presignResponse.ok) {
    throw new Error("Legacy storage upload signing failed (" + presignResponse.status + ").");
  }

  const payload = (await presignResponse.json()) as { url?: unknown };
  if (typeof payload.url !== "string" || !payload.url) {
    throw new Error("Legacy storage returned an invalid upload URL.");
  }

  const uploadResponse = await fetch(payload.url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: new Blob([data as any], { type: contentType }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!uploadResponse.ok) {
    throw new Error("Legacy storage upload failed (" + uploadResponse.status + ").");
  }
}

async function s3Put(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
) {
  const { client, bucket } = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.isBuffer(data) ? data : Buffer.from(data),
      ContentType: contentType,
    }),
  );
}

async function forgeGetSignedUrl(key: string): Promise<string> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const url = new URL("v1/storage/presign/get", forgeUrl + "/");
  url.searchParams.set("path", key);
  const response = await fetch(url, {
    headers: { Authorization: "Bearer " + forgeKey },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error("Legacy storage download signing failed (" + response.status + ").");
  }
  const payload = (await response.json()) as { url?: unknown };
  if (typeof payload.url !== "string" || !payload.url) {
    throw new Error("Legacy storage returned an invalid download URL.");
  }
  return payload.url;
}

async function s3GetSignedUrl(key: string): Promise<string> {
  const { client, bucket } = getS3Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 300 },
  );
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const provider = storageProvider();

  if (provider === "s3") {
    await s3Put(key, data, contentType);
  } else if (provider === "dual") {
    // During migration, mirror new writes to both stores. Reads remain on the
    // legacy store until the complete object inventory has been copied and verified.
    await Promise.all([
      forgePut(key, data, contentType),
      s3Put(key, data, contentType),
    ]);
  } else {
    await forgePut(key, data, contentType);
  }

  // Keep the established proxy URL so existing database references remain valid.
  return { key, url: "/storage/" + key };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: "/storage/" + key };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  // "dual" deliberately reads from the legacy store until object-copy verification is complete.
  return storageProvider() === "s3" ? s3GetSignedUrl(key) : forgeGetSignedUrl(key);
}
