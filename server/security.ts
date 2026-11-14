import type { Request, RequestHandler, Response } from "express";
import { consumeSharedRateLimit } from "./db";

type HeaderMap = Record<string, string>;

export function buildContentSecurityPolicy(isProduction: boolean) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "form-action 'self'",
    "manifest-src 'self'",
    "script-src 'self' https:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' https: wss:${isProduction ? "" : " ws:"}`,
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function getSecurityHeaders(isProduction: boolean): HeaderMap {
  const headers: HeaderMap = {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    [isProduction ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only"]: buildContentSecurityPolicy(isProduction),
    "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Permitted-Cross-Domain-Policies": "none",
  };
  if (isProduction) headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  return headers;
}

export function applySecurityHeaders(res: Pick<Response, "set">, isProduction: boolean) {
  res.set(getSecurityHeaders(isProduction));
}

export function securityHeadersMiddleware(isProduction: boolean): RequestHandler {
  return (_req, res, next) => {
    applySecurityHeaders(res, isProduction);
    next();
  };
}

export function getRequestClientKey(req: Pick<Request, "headers" | "ip">) {
  return req.ip || "unknown";
}

function getRateLimitFailureMetadata(error: unknown) {
  const root = typeof error === "object" && error !== null ? error as { code?: unknown; sqlState?: unknown; sqlstate?: unknown; rateLimitStage?: unknown; cause?: unknown } : {};
  const cause = typeof root.cause === "object" && root.cause !== null ? root.cause as { code?: unknown; sqlState?: unknown; sqlstate?: unknown } : {};
  const rawCode = root.code ?? cause.code;
  const code = typeof rawCode === "string" && /^(?:ER_[A-Z0-9_]{1,40}|E[A-Z0-9_]{1,40})$/.test(rawCode) ? rawCode : undefined;
  const rawSqlState = root.sqlState ?? root.sqlstate ?? cause.sqlState ?? cause.sqlstate;
  const sqlState = typeof rawSqlState === "string" && /^[0-9A-Z]{5}$/.test(rawSqlState) ? rawSqlState : undefined;
  const allowedStages = ["key_derivation", "database_connection", "bucket_write", "bucket_read"];
  const stage = typeof root.rateLimitStage === "string" && allowedStages.includes(root.rateLimitStage) ? root.rateLimitStage : undefined;
  return {
    event: "shared_rate_limit_unavailable",
    errorKind: error instanceof Error ? "error" : "non_error",
    ...(stage ? { stage } : {}),
    ...(code ? { errorCode: code } : {}),
    ...(sqlState ? { sqlState } : {}),
  };
}

export function createRateLimitMiddleware(input: { namespace: string; limit: number; windowMs: number; matcher?: (requestPath: string) => boolean; consume?: typeof consumeSharedRateLimit }): RequestHandler {
  const consume = input.consume ?? consumeSharedRateLimit;
  return async (req, res, next) => {
    const requestPath = `${req.baseUrl}${req.path}`;
    if (input.matcher && !input.matcher(req.originalUrl)) return next();
    try {
      const decision = await consume({ namespace: input.namespace, route: requestPath, clientKey: getRequestClientKey(req), limit: input.limit, windowMs: input.windowMs });
      if (decision.allowed) return next();
      res.set({ "Cache-Control": "no-store", "Retry-After": String(decision.retryAfterSeconds) });
      return res.status(429).json({ error: "Too many requests. Please wait and try again." });
    } catch (error) {
      console.error("[security] shared rate-limit dependency failed", getRateLimitFailureMetadata(error));
      return res.status(503).json({ error: "Request protection is temporarily unavailable. Please retry shortly." });
    }
  };
}

export function isTrustedMutationOrigin(origin: string | undefined, protocol: string, host: string | undefined) {
  if (!origin || !host) return false;
  return origin === protocol + "://" + host;
}

export function requireSameOriginForMutations(): RequestHandler {
  return (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol = forwardedProtocol || req.protocol || "https";
    const host = req.get("x-forwarded-host") || req.get("host");
    if (isTrustedMutationOrigin(req.get("origin") ?? undefined, protocol, host)) return next();
    res.status(403).json({ error: "Cross-site mutation requests are not allowed." });
  };
}
