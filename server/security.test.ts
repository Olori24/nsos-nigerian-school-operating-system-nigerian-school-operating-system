import { describe, expect, it, vi } from "vitest";
import { buildContentSecurityPolicy, createRateLimitMiddleware, getSecurityHeaders, isTrustedMutationOrigin } from "./security";
import { sanitizeSecurityAuditMetadata } from "./db";
import { requiredProductionEnvironmentErrors } from "./observability";

describe("NSOS security hardening rules", () => {
  it("builds a conservative production browser-security header baseline", () => {
    const headers = getSecurityHeaders(true);
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Strict-Transport-Security"]).toContain("max-age=31536000");
    expect(buildContentSecurityPolicy(true)).toContain("frame-ancestors 'none'");
    expect(buildContentSecurityPolicy(true)).toContain("upgrade-insecure-requests");
  });

  it("enforces a shared limiter decision at the Express boundary", async () => {
    const middleware = createRateLimitMiddleware({ namespace: "test", limit: 2, windowMs: 1_000, consume: async () => ({ allowed: false, retryAfterSeconds: 9 }) });
    const response = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    await middleware({ baseUrl: "/api", path: "/trpc/test", originalUrl: "/api/trpc/test", ip: "127.0.0.1" } as any, response as any, next);
    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.set).toHaveBeenCalledWith({ "Cache-Control": "no-store", "Retry-After": "9" });
    expect(next).not.toHaveBeenCalled();
  });

  it("requires production session secrets to be at least 32 characters", () => {
    const base = { isProduction: true, cookieSecret: "a".repeat(32), databaseUrl: "mysql://db", googleClientId: "google-client", googleClientSecret: "google-secret", geminiApiKey: "gemini-key", s3Bucket: "bucket", s3AccessKeyId: "access", s3SecretAccessKey: "secret", resendApiKey: "resend-key", authEmailFrom: "NSOS <noreply@nsos.top>", ownerNotificationEmail: "owner@nsos.top" };
    expect(requiredProductionEnvironmentErrors({ ...base, cookieSecret: "short" })).toContain("JWT_SECRET is required in production.");
    expect(requiredProductionEnvironmentErrors({ ...base, cookieSecret: "12345678901234567890123456789012" })).not.toContain("JWT_SECRET is required in production.");
  });

  it("allows same-origin state changes and redacts sensitive audit metadata", () => {
    expect(isTrustedMutationOrigin("https://nsos.top", "https", "nsos.top")).toBe(true);
    expect(isTrustedMutationOrigin("https://attacker.example", "https", "nsos.top")).toBe(false);
    expect(isTrustedMutationOrigin(undefined, "https", "nsos.top")).toBe(false);
    expect(sanitizeSecurityAuditMetadata({ provider: "termii", apiKey: "secret", recipientPhone: "2348031234567", deliveryTracking: "pending" })).toEqual({ provider: "termii", apiKey: "[REDACTED]", recipientPhone: "[REDACTED]", deliveryTracking: "pending" });
    expect(sanitizeSecurityAuditMetadata({ approvalNote: "Reviewed against the approved termly fee schedule." })).toEqual({ approvalNote: "Reviewed against the approved termly fee schedule." });
  });
});
