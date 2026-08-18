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
    } catch {
      return res.status(503).json({ error: "Request protection is temporarily unavailable. Please retry shortly." });
    }
  };
}

export function isTrustedMutationOrigin(origin: string | undefined, protocol: string, host: string | undefined) {
  if (!origin) return true;
  if (!host) return false;
  return origin === `${protocol}://${host}`;
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
