import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { livenessResponse, requestIdFor, requestObservabilityMiddleware, requiredProductionEnvironmentErrors, safeRequestPath, unexpectedErrorObservabilityMiddleware } from "./observability";

describe("production observability controls", () => {
  it("returns a minimal liveness payload without configuration, tenant, or infrastructure data", () => {
    expect(livenessResponse(() => new Date("2026-08-26T20:00:00.000Z"))).toEqual({ status: "ok", service: "nsos", timestamp: "2026-08-26T20:00:00.000Z" });
  });

  it("uses a bounded correlation ID and never includes a query string in its request path", () => {
    expect(requestIdFor("safe_request-123")).toBe("safe_request-123");
    expect(requestIdFor("not safe?secret=1")).toMatch(/^[a-f0-9-]{36}$/);
    expect(safeRequestPath({ baseUrl: "/api", path: "/trpc/nsos.portal?token=secret" } as any)).toBe("/api/trpc/nsos.portal");
  });

  it("records only correlation, method, path, status, and duration on completion", () => {
    const response = Object.assign(new EventEmitter(), { statusCode: 503, set: vi.fn() });
    const request = { method: "POST", baseUrl: "/api", path: "/trpc/nsos.finance.save", get: vi.fn(() => "trace-12345678") };
    const log = vi.fn();
    const next = vi.fn();
    let current = 100;
    requestObservabilityMiddleware({ now: () => current, log: log as any })(request as any, response as any, next);
    current = 2_275;
    response.emit("finish");
    expect(response.set).toHaveBeenCalledWith("X-Request-ID", "trace-12345678");
    expect(log).toHaveBeenCalledWith("error", "http_request_completed", { requestId: "trace-12345678", method: "POST", path: "/api/trpc/nsos.finance.save", statusCode: 503, durationMs: 2175, slow: true });
  });

  it("fails production startup only when a core runtime secret or connection setting is absent", () => {
    expect(requiredProductionEnvironmentErrors({ isProduction: false, appId: "", cookieSecret: "", databaseUrl: "", oAuthServerUrl: "" })).toEqual([]);
    expect(requiredProductionEnvironmentErrors({ isProduction: true, appId: "app", cookieSecret: "", databaseUrl: "db", oAuthServerUrl: "" })).toEqual(["JWT_SECRET is required in production.", "OAUTH_SERVER_URL is required in production."]);
  });

  it("returns an opaque correlated unexpected-error response without logging the error message", () => {
    const log = vi.fn();
    const response = {
      getHeader: vi.fn(() => "trace-12345678"),
      set: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      headersSent: false,
    };
    const request = { method: "POST", baseUrl: "/api", path: "/auth?token=secret", get: vi.fn(() => "trace-12345678") };
    unexpectedErrorObservabilityMiddleware({ log: log as any })(new Error("provider key secret"), request as any, response as any, vi.fn());
    expect(response.set).toHaveBeenCalledWith("X-Request-ID", "trace-12345678");
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: "internal_error", requestId: "trace-12345678" });
    expect(log).toHaveBeenCalledWith("error", "http_request_unhandled", { requestId: "trace-12345678", method: "POST", path: "/api/auth", statusCode: 500, errorType: "Error" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("provider key secret");
  });
});
