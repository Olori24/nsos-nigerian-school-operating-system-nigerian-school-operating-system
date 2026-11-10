import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { requestIdFor, requestObservabilityMiddleware, requiredProductionEnvironmentErrors, safeRequestPath } from "./observability";

describe("production observability controls", () => {
  it("uses a bounded correlation ID and never includes a query string in its request path", () => {
    expect(requestIdFor("safe_request-123")).toBe("safe_request-123");
    expect(requestIdFor("not safe?secret=1")).toMatch(/^[a-f0-9-]{36}$/);
    expect(safeRequestPath({ baseUrl: "/api", path: "/trpc/nsos.portal?token=secret" } as any)).toBe("/api/trpc/nsos.portal");
  });

  it("records correlation, method, path, status, duration, and resource telemetry on completion", () => {
    const response = Object.assign(new EventEmitter(), { statusCode: 503, set: vi.fn() });
    const request = { method: "POST", baseUrl: "/api", path: "/trpc/nsos.finance.save", get: vi.fn(() => "trace-12345678") };
    const log = vi.fn();
    const resource = vi.fn(() => ({ rssMb: 120.5, heapUsedMb: 80.25, heapTotalMb: 128, externalMb: 4.75 }));
    const next = vi.fn();
    let current = 100;
    requestObservabilityMiddleware({ now: () => current, log: log as any, resource })(request as any, response as any, next);
    current = 2_275;
    response.emit("finish");
    expect(response.set).toHaveBeenCalledWith("X-Request-ID", "trace-12345678");
    expect(resource).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith("error", "http_request_completed", {
      requestId: "trace-12345678",
      method: "POST",
      path: "/api/trpc/nsos.finance.save",
      statusCode: 503,
      durationMs: 2175,
      slow: true,
      rssMb: 120.5,
      heapUsedMb: 80.25,
      heapTotalMb: 128,
      externalMb: 4.75,
    });
  });

  it("fails production startup only when a core runtime secret or connection setting is absent", () => {
    expect(requiredProductionEnvironmentErrors({ isProduction: false, appId: "", cookieSecret: "", databaseUrl: "", oAuthServerUrl: "" })).toEqual([]);
    expect(requiredProductionEnvironmentErrors({ isProduction: true, appId: "app", cookieSecret: "", databaseUrl: "db", oAuthServerUrl: "" })).toEqual(["OWNER_OPEN_ID is required in production.", "JWT_SECRET is required in production.", "OAUTH_SERVER_URL is required in production.", "PUBLIC_APP_URL is required in production."]);
    expect(requiredProductionEnvironmentErrors({ isProduction: true, appId: "app", ownerOpenId: "owner-open-id", cookieSecret: "12345678901234567890123456789012", databaseUrl: "db", oAuthServerUrl: "https://auth.example", publicAppUrl: "https://nsos.test", storageProvider: "s3" })).toContain("S3 storage is selected but these settings are missing: S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION.");
    expect(requiredProductionEnvironmentErrors({ isProduction: true, appId: "app", ownerOpenId: "owner-open-id", cookieSecret: "12345678901234567890123456789012", databaseUrl: "db", oAuthServerUrl: "https://auth.example", publicAppUrl: "https://nsos.test", storageProvider: "dual", s3Bucket: "bucket", s3AccessKeyId: "key", s3SecretAccessKey: "secret", s3Region: "auto" })).toContain("Forge integration is selected but these settings are missing: BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY.");
    expect(requiredProductionEnvironmentErrors({ isProduction: true, appId: "app", ownerOpenId: "owner-open-id", cookieSecret: "12345678901234567890123456789012", databaseUrl: "db", oAuthServerUrl: "https://auth.example", publicAppUrl: "https://nsos.test", llmProvider: "openai-compatible" })).toContain("OpenAI-compatible LLM is selected but these settings are missing: LLM_API_BASE_URL, LLM_API_KEY, LLM_MODEL.");
    expect(requiredProductionEnvironmentErrors({ isProduction: true, appId: "app", ownerOpenId: "owner-open-id", cookieSecret: "12345678901234567890123456789012", databaseUrl: "db", oAuthServerUrl: "https://auth.example", publicAppUrl: "https://nsos.test", llmProvider: "forge" })).toContain("Forge integration is selected but these settings are missing: BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY.");
    expect(requiredProductionEnvironmentErrors({ isProduction: true, appId: "app", ownerOpenId: "owner-open-id", cookieSecret: "12345678901234567890123456789012", databaseUrl: "db", oAuthServerUrl: "", legacyAuthEnabled: false, googleClientId: "google-client", googleClientSecret: "google-secret", resendApiKey: "resend-key", authEmailFrom: "NSOS <alerts@nsos.test>", publicAppUrl: "https://nsos.test", storageProvider: "s3", s3Bucket: "bucket", s3AccessKeyId: "key", s3SecretAccessKey: "secret", s3Region: "auto", llmProvider: "openai-compatible", llmApiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", llmApiKey: "key", llmModel: "gemini-model" })).not.toContain("OAUTH_SERVER_URL is required in production.");
    expect(requiredProductionEnvironmentErrors({ isProduction: true, appId: "app", ownerOpenId: "owner-open-id", cookieSecret: "12345678901234567890123456789012", databaseUrl: "db", oAuthServerUrl: "", legacyAuthEnabled: false, publicAppUrl: "https://nsos.test" })).toContain("Standalone sign-in is selected but these settings are missing: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, RESEND_API_KEY, AUTH_EMAIL_FROM.");
  });
});
