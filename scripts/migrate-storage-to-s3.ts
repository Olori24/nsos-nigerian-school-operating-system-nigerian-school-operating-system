import { createConnection } from "mysql2/promise";
import { copyLegacyObjectToS3 } from "../server/storage";
import { ENV } from "../server/_core/env";

const objectColumns = [
  { table: "institutionKnowledgeSources", column: "storageKey" },
  { table: "institutionKnowledgeSourceRevisions", column: "storageKey" },
  { table: "schoolWebsiteMedia", column: "storageKey" },
  { table: "admissionDocuments", column: "storageKey" },
  { table: "schemeOfWorkImports", column: "fileKey" },
  { table: "paymentEvidence", column: "evidenceFileKey" },
] as const;

function normalizeStoredKey(value: unknown) {
  let key = String(value ?? "").trim();
  if (!key) return "";
  if (/^https?:\/\//i.test(key)) key = new URL(key).pathname;
  key = key.replace(/^\/?(?:manus-storage|storage)\//, "");
  if (!key || key.length > 1024 || key.includes("\\") || !/^[A-Za-z0-9._/-]+$/.test(key) || key.split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error("The database contains an invalid object key.");
  }
  return key;
}

async function main() {
  if (!ENV.databaseUrl) throw new Error("DATABASE_URL is required.");
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) throw new Error("Legacy storage credentials are required for source reads.");
  if (!ENV.s3Bucket || !ENV.s3AccessKeyId || !ENV.s3SecretAccessKey || !ENV.s3Region) throw new Error("S3 target credentials are required.");

  const copy = process.argv.includes("--copy");
  if (copy) {
    if (process.env.STORAGE_MIGRATION_APPROVED !== "true") throw new Error("Copy mode requires STORAGE_MIGRATION_APPROVED=true.");
    if (process.env.STORAGE_MIGRATION_TARGET !== "staging") throw new Error("Copy mode is restricted to an explicitly named staging target.");
    if (process.env.STORAGE_MIGRATION_TARGET_BUCKET !== ENV.s3Bucket) throw new Error("Confirm the exact S3_BUCKET using STORAGE_MIGRATION_TARGET_BUCKET.");
  }

  const connection = await createConnection(ENV.databaseUrl);
  try {
    const keys = new Set<string>();
    for (const item of objectColumns) {
      const [columns] = await connection.query(
        "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
        [item.table, item.column],
      );
      if (!(columns as Array<{ COLUMN_NAME: string }>).length) {
        throw new Error("Required storage reference column is missing: " + item.table + "." + item.column);
      }
      const query = "SELECT DISTINCT `" + item.column + "` AS objectKey FROM `" + item.table + "` WHERE `" + item.column + "` IS NOT NULL AND `" + item.column + "` <> ''";
      const [rows] = await connection.query(query);
      for (const row of rows as Array<{ objectKey: unknown }>) {
        const key = normalizeStoredKey(row.objectKey);
        if (key) keys.add(key);
      }
    }

    const orderedKeys = [...keys].sort();
    console.info(JSON.stringify({
      mode: copy ? "copy-and-verify" : "dry-run",
      referencedObjectCount: orderedKeys.length,
      targetBucket: copy ? ENV.s3Bucket : undefined,
      productionDatabaseModified: false,
      legacyObjectsDeleted: false,
    }));

    if (!copy) {
      console.info("Dry run only. No object bytes were copied. Re-run with --copy and the required explicit staging confirmations after staging credentials and backup checks are approved.");
      return;
    }

    let copied = 0;
    let totalBytes = 0;
    let failed = 0;
    for (const key of orderedKeys) {
      try {
        const result = await copyLegacyObjectToS3(key);
        copied += 1;
        totalBytes += result.bytes;
      } catch {
        failed += 1;
        console.error("Object copy/verification failed for one referenced object. Key details are withheld.");
      }
    }
    console.info(JSON.stringify({ copied, failed, totalBytes, totalObjects: orderedKeys.length, productionDatabaseModified: false, legacyObjectsDeleted: false }));
    if (failed > 0) process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error("Storage migration stopped safely:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
