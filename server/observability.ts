import { randomUUID } from "node:crypto";
import type { Request, RequestHandler } from "express";

const SLOW_REQUEST_MS = 2_000;
const requestIdPattern = /^[A-Za-z0-9_-]{8,96}$/;

type ResourceSnapshot = {
  rssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
  externalMb: number;
};

function resourceSnapshot(): ResourceSnapshot {
  const memory = process.memoryUsage();
  const toMb = (bytes: number) => Number((bytes / 1024 / 1024).toFixed(2));
  return {
    rssMb: toMb(memory.rss),
    heapUsedMb: toMb(memory.heapUsed),
    heapTotalMb: toMb(memory.heapTotal),
    externalMb: toMb(memory.external),
  };
}

export function requestIdFor(value: string | undefined) {
  return value && requestIdPattern.test(value) ? value : randomUUID();
}

export function safeRequestPath(request: Pick<Request, "baseUrl" | "path">) {
  return (request.baseUrl || "") + (request.path || "").split("?", 1)[0]!.slice(0, 320) || "/";
}

export function writeOperationalEvent(level: "info" | "warn" | "error", event: string, fields: Record<string, string | number | boolean | undefined>) {
  const payload = { timestamp: new Date().toISOString(), service: "nsos", event, ...fields };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export function requestObservabilityMiddleware(options: {
  now?: () => number;
  log?: typeof writeOperationalEvent;
  resource?: () => ResourceSnapshot;
} = {}): RequestHandler {
  const now = options.now ?? (() => Date.now());
  const log = options.log ?? writeOperationalEvent;
  const readResource = options.resource ?? resourceSnapshot;
  return (request, response, next) => {
    const requestId = requestIdFor(request.get("x-request-id") ?? undefined);
    const startedAt = now();
    response.set("X-Request-ID", requestId);
    response.once("finish", () => {
      const durationMs = Math.max(0, Math.round(now() - startedAt));
      const statusCode = response.statusCode;
      const level = statusCode >= 500 ? "error" : durationMs >= SLOW_REQUEST_MS ? "warn" : "info";
      log(level, "http_request_completed", {
        requestId,
        method: request.method,
        path: safeRequestPath(request),
        statusCode,
        durationMs,
        slow: durationMs >= SLOW_REQUEST_MS,
        ...readResource(),
      });
    });
    next();
  };
}

export function requiredProductionEnvironmentErrors(input: {
  isProduction: boolean;
  appId: string;
  cookieSecret: string;
  databaseUrl: string;
  oAuthServerUrl: string;
  storageProvider?: string;
  s3Bucket?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3Region?: string;
}) {
  if (!input.isProduction) return [];
  const errors = [
    ["VITE_APP_ID", input.appId],
    ["JWT_SECRET", input.cookieSecret && input.cookieSecret.length >= 32 ? input.cookieSecret : ""],
    ["DATABASE_URL", input.databaseUrl],
    ["OAUTH_SERVER_URL", input.oAuthServerUrl],
  ].filter(([, value]) => !value?.trim()).map(([name]) => name + " is required in production.");

  if (input.storageProvider && !["forge", "s3", "dual"].includes(input.storageProvider)) {
    errors.push("STORAGE_PROVIDER must be forge, s3, or dual.");
  }
  if (input.storageProvider === "s3" || input.storageProvider === "dual") {
    const missingStorage = [
      ["S3_BUCKET", input.s3Bucket],
      ["S3_ACCESS_KEY_ID", input.s3AccessKeyId],
      ["S3_SECRET_ACCESS_KEY", input.s3SecretAccessKey],
      ["S3_REGION", input.s3Region],
    ].filter(([, value]) => !value?.trim()).map(([name]) => name);
    if (missingStorage.length) errors.push("S3 storage is selected but these settings are missing: " + missingStorage.join(", ") + ".");
  }
  return errors;
}
