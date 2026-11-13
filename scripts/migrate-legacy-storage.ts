import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createConnection } from "mysql2/promise";

const MAX_OBJECT_BYTES = 50 * 1024 * 1024;
const timeoutMs = 30_000;
const apply = process.argv.includes("--apply");

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function isMissing(error: unknown) {
  const value = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return value?.$metadata?.httpStatusCode === 404 || ["NoSuchKey", "NotFound", "404"].includes(value?.name ?? value?.Code ?? "");
}

function trustedObjectUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const trusted = host === "s3.amazonaws.com" || host.endsWith(".amazonaws.com") ||
    /^[a-f0-9]{32}\\.r2\\.cloudflarestorage\\.com$/.test(host);
  if (url.protocol !== "https:" || !trusted || url.username || url.password) {
    throw new Error("Legacy provider returned an untrusted object URL.");
  }
  return url;
}

async function main() {
  if (apply) {
    if (required("NSOS_STORAGE_MIGRATION_ENV") !== "staging") throw new Error("Apply mode is restricted to the staging environment.");
    if (required("NSOS_STORAGE_MIGRATION_CONFIRM") !== "MIGRATE_STAGING_OBJECTS") throw new Error("Explicit staging migration confirmation is required.");
    if (process.env.VERCEL_ENV === "production") throw new Error("Production runtime is not permitted.");
  }

  const databaseUrl = new URL(required("DATABASE_URL"));
  if (databaseUrl.protocol !== "mysql:") throw new Error("DATABASE_URL must use mysql://.");
  const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\\//, ""));
  if (!databaseName || required("NSOS_STORAGE_MIGRATION_DATABASE") !== databaseName) {
    throw new Error("Database name does not match the explicit migration allow-list.");
  }
  if (databaseUrl.hostname !== required("NSOS_STORAGE_MIGRATION_DATABASE_HOST")) {
    throw new Error("Database host does not match the explicit staging host allow-list.");
  }

  const forgeBase = required("LEGACY_STORAGE_FORGE_API_URL").replace(/\\/+$/, "");
  const forgeBaseUrl = new URL(forgeBase);
  if (forgeBaseUrl.protocol !== "https:" || forgeBaseUrl.username || forgeBaseUrl.password || forgeBaseUrl.search || forgeBaseUrl.hash) {
    throw new Error("Legacy Forge API must be a trusted HTTPS URL.");
  }
  const forgeKey = required("LEGACY_STORAGE_FORGE_API_KEY");
  const bucket = required("S3_BUCKET");
  const accessKeyId = required("S3_ACCESS_KEY_ID");
  const secretAccessKey = required("S3_SECRET_ACCESS_KEY");
  const endpoint = process.env.S3_ENDPOINT?.trim();
  if (endpoint) {
    const endpointUrl = new URL(endpoint);
    const endpointHost = endpointUrl.hostname.toLowerCase();
    const trustedEndpoint = /^[a-f0-9]{32}\\.r2\\.cloudflarestorage\\.com$/.test(endpointHost) || endpointHost === "s3.amazonaws.com" || /^s3[.-][a-z0-9-]+\\.amazonaws\\.com$/.test(endpointHost);
    if (endpointUrl.protocol !== "https:" || !trustedEndpoint || endpointUrl.username || endpointUrl.password || endpointUrl.pathname !== "/" || endpointUrl.search || endpointUrl.hash) {
      throw new Error("S3_ENDPOINT must be a trusted HTTPS Cloudflare R2 or AWS S3 endpoint.");
    }
  }
  const region = process.env.S3_REGION?.trim() || "auto";
  const s3 = new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    credentials: { accessKeyId, secretAccessKey },
  });

  const local = ["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname);
  const connection = await createConnection({
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || 3306),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    database: databaseName,
    ...(local ? {} : { ssl: { rejectUnauthorized: true } }),
    connectTimeout: timeoutMs,
  });

  try {
    const [columns] = await connection.query(
      "SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND COLUMN_NAME IN ('storageKey', 'fileKey', 'evidenceFileKey') ORDER BY TABLE_NAME, COLUMN_NAME",
      [databaseName],
    ) as [Array<{ TABLE_NAME: string; COLUMN_NAME: string }>, unknown];
    const keys = new Set<string>();
    for (const column of columns) {
      if (!/^[A-Za-z0-9_]+$/.test(column.TABLE_NAME) || !/^[A-Za-z0-9_]+$/.test(column.COLUMN_NAME)) {
        throw new Error("Unexpected database identifier in storage inventory.");
      }
      const [rows] = await connection.query(
        `SELECT DISTINCT \`${column.COLUMN_NAME}\` AS storageKey FROM \`${column.TABLE_NAME}\` WHERE \`${column.COLUMN_NAME}\` IS NOT NULL AND \`${column.COLUMN_NAME}\` <> ''`,
      ) as [Array<{ storageKey: string | null }>, unknown];
      for (const row of rows) {
        const key = row.storageKey?.replace(/^\\/+/, "");
        if (key?.startsWith("schools/") && !key.split("/").some(part => !part || part === "." || part === "..") && key.length <= 900) keys.add(key);
      }
    }

    console.log(`Storage inventory: ${keys.size} unique school object keys found across ${columns.length} database columns.`);
    if (!apply) {
      console.log("Dry run only. No objects were downloaded, uploaded, or modified.");
      return;
    }

    let copied = 0;
    let alreadyPresent = 0;
    for (const key of keys) {
      try {
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        alreadyPresent += 1;
        continue;
      } catch (error) {
        if (!isMissing(error)) throw error;
      }

      const presign = new URL("v1/storage/presign/get", forgeBaseUrl.toString().replace(/\\/+$/, "") + "/");
      presign.searchParams.set("path", key);
      const presignResponse = await fetch(presign, {
        headers: { Authorization: `Bearer ${forgeKey}` },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!presignResponse.ok) throw new Error(`Legacy provider rejected a read request (HTTP ${presignResponse.status}).`);
      const payload = await presignResponse.json().catch(() => ({})) as { url?: unknown };
      if (typeof payload.url !== "string") throw new Error("Legacy provider returned an invalid signed URL.");
      const objectUrl = trustedObjectUrl(payload.url);
      const objectResponse = await fetch(objectUrl, { signal: AbortSignal.timeout(timeoutMs), redirect: "error" });
      if (!objectResponse.ok) throw new Error(`Legacy object download failed (HTTP ${objectResponse.status}).`);
      const contentLength = Number(objectResponse.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > MAX_OBJECT_BYTES) {
        throw new Error("Object exceeds the 50 MB migration safety limit; migrate it through an approved large-object process.");
      }
      const body = Buffer.from(await objectResponse.arrayBuffer());
      if (body.byteLength > MAX_OBJECT_BYTES) throw new Error("Downloaded object exceeds the 50 MB migration safety limit.");
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: objectResponse.headers.get("content-type") || "application/octet-stream",
      }));
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      copied += 1;
      if ((copied + alreadyPresent) % 25 === 0) console.log(`Progress: ${copied} copied, ${alreadyPresent} already present.`);
    }
    console.log(`Migration complete: ${copied} copied, ${alreadyPresent} already present, ${keys.size} total.`);
  } finally {
    await connection.end();
    s3.destroy();
  }
}

main().catch(error => {
  console.error("Legacy storage migration failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
