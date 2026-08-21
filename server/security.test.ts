import { describe, expect, it, vi } from "vitest";
import { buildContentSecurityPolicy, createRateLimitMiddleware, getSecurityHeaders, isTrustedMutationOrigin } from "./security";
import { sanitizeSecurityAuditMetadata } from "./db";

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

  it("allows same-origin state changes and redacts sensitive audit metadata", () => {
    expect(isTrustedMutationOrigin("https://nsos-system-uhkdscaf.manus.space", "https", "nsos-system-uhkdscaf.manus.space")).toBe(true);
    expect(isTrustedMutationOrigin("https://attacker.example", "https", "nsos-system-uhkdscaf.manus.space")).toBe(false);
    expect(sanitizeSecurityAuditMetadata({ provider: "termii", apiKey: "secret", recipientPhone: "2348031234567", deliveryTracking: "pending" })).toEqual({ provider: "termii", apiKey: "[REDACTED]", recipientPhone: "[REDACTED]", deliveryTracking: "pending" });
    expect(sanitizeSecurityAuditMetadata({ approvalNote: "Reviewed against the approved termly fee schedule." })).toEqual({ approvalNote: "Reviewed against the approved termly fee schedule." });
  });
});
