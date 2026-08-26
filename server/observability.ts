import { randomUUID } from "node:crypto";
import type { ErrorRequestHandler, Request, RequestHandler, Response } from "express";

const SLOW_REQUEST_MS = 2_000;
const requestIdPattern = /^[A-Za-z0-9_-]{8,96}$/;

export function requestIdFor(value: string | undefined) {
  return value && requestIdPattern.test(value) ? value : randomUUID();
}

export function safeRequestPath(request: Pick<Request, "baseUrl" | "path">) {
  return `${request.baseUrl || ""}${request.path || ""}`.split("?", 1)[0]!.slice(0, 320) || "/";
}

export function writeOperationalEvent(level: "info" | "warn" | "error", event: string, fields: Record<string, string | number | boolean | undefined>) {
  const payload = { timestamp: new Date().toISOString(), service: "nsos", event, ...fields };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export function livenessResponse(now: () => Date = () => new Date()) {
  return { status: "ok" as const, service: "nsos" as const, timestamp: now().toISOString() };
}

export function requestObservabilityMiddleware(options: { now?: () => number; log?: typeof writeOperationalEvent } = {}): RequestHandler {
  const now = options.now ?? (() => Date.now());
  const log = options.log ?? writeOperationalEvent;
  return (request, response, next) => {
    const requestId = requestIdFor(request.get("x-request-id") ?? undefined);
    const startedAt = now();
    response.set("X-Request-ID", requestId);
    response.once("finish", () => {
      const durationMs = Math.max(0, Math.round(now() - startedAt));
      const statusCode = response.statusCode;
      const level = statusCode >= 500 ? "error" : durationMs >= SLOW_REQUEST_MS ? "warn" : "info";
      log(level, "http_request_completed", { requestId, method: request.method, path: safeRequestPath(request), statusCode, durationMs, slow: durationMs >= SLOW_REQUEST_MS });
    });
    next();
  };
}

function safeErrorType(error: unknown) {
  const candidate = error instanceof Error ? error.name : "unknown_error";
  return /^[A-Za-z0-9_.-]{1,64}$/.test(candidate) ? candidate : "unknown_error";
}

export function unexpectedErrorObservabilityMiddleware(options: { log?: typeof writeOperationalEvent } = {}): ErrorRequestHandler {
  const log = options.log ?? writeOperationalEvent;
  return (error, request, response, next) => {
    const existingRequestId = response.getHeader("X-Request-ID");
    const requestId = typeof existingRequestId === "string" ? requestIdFor(existingRequestId) : requestIdFor(request.get("x-request-id") ?? undefined);
    response.set("X-Request-ID", requestId);
    log("error", "http_request_unhandled", {
      requestId,
      method: request.method,
      path: safeRequestPath(request),
      statusCode: 500,
      errorType: safeErrorType(error),
    });
    if (response.headersSent) return next(error);
    response.status(500).json({ error: "internal_error", requestId });
  };
}

export function requiredProductionEnvironmentErrors(input: { isProduction: boolean; appId: string; cookieSecret: string; databaseUrl: string; oAuthServerUrl: string }) {
  if (!input.isProduction) return [];
  return [
    ["VITE_APP_ID", input.appId],
    ["JWT_SECRET", input.cookieSecret],
    ["DATABASE_URL", input.databaseUrl],
    ["OAUTH_SERVER_URL", input.oAuthServerUrl],
  ].filter(([, value]) => !value.trim()).map(([name]) => `${name} is required in production.`);
}
