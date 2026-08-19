import express from "express";
import { createServer, request as httpRequest } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authRoutePolicies, registerEmailAuthRoutes, registerGoogleAuthRoutes } from "./auth";
import * as database from "./db";
import { normaliseAuthEmail } from "./db";

async function withAuthRouteServer<T>(run: (origin: string) => Promise<T>) {
  const app = express();
  app.use(express.json());
  registerGoogleAuthRoutes(app);
  registerEmailAuthRoutes(app);
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind to a local port.");
  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

async function requestRoute(url: string, input: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  const target = new URL(url);
  return new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }>((resolve, reject) => {
    const request = httpRequest({ hostname: target.hostname, port: target.port, path: `${target.pathname}${target.search}`, method: input.method ?? "GET", headers: input.headers }, response => {
      const chunks: Buffer[] = [];
      response.on("data", chunk => chunks.push(Buffer.from(chunk)));
      response.on("end", () => resolve({ status: response.statusCode ?? 0, headers: response.headers, body: Buffer.concat(chunks).toString("utf8") }));
    });
    request.on("error", reject);
    if (input.body) request.write(input.body);
    request.end();
  });
}

function getGoogleState(setCookie: string | string[] | undefined) {
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const encodedState = cookie?.match(/__Host-google_oauth_state=([^;]+)/)?.[1];
  if (!encodedState) throw new Error("Google state cookie was not set.");
  return JSON.parse(decodeURIComponent(encodedState)) as { state: string; origin: string };
}

function headerText(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.join("\n") : value ?? "";
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("external authentication policy", () => {
  it("normalises a valid passwordless-email address", () => {
    expect(normaliseAuthEmail("  ADMIN@Greener-Future.edu.ng ")).toBe("admin@greener-future.edu.ng");
  });

  it("rejects malformed passwordless-email addresses", () => {
    expect(() => normaliseAuthEmail("not-an-email")).toThrow("Enter a valid email address.");
  });

  it("allows only an exact HTTPS origin or a local HTTP development origin", () => {
    expect(authRoutePolicies.validOrigin("https://nsos-system-uhkdscaf.manus.space")).toBe("https://nsos-system-uhkdscaf.manus.space");
    expect(authRoutePolicies.validOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(authRoutePolicies.validOrigin("https://nsos-system-uhkdscaf.manus.space/unsafe-path")).toBeUndefined();
    expect(authRoutePolicies.validOrigin("http://school.example.ng")).toBeUndefined();
  });

  it("requires an exact browser-bound OAuth state match", () => {
    expect(authRoutePolicies.matchesState("secure-state", "secure-state")).toBe(true);
    expect(authRoutePolicies.matchesState("secure-state", "other-state")).toBe(false);
    expect(authRoutePolicies.matchesState("secure-state", undefined)).toBe(false);
  });

  it("accepts only the expected one-time email-link token shape", () => {
    expect(authRoutePolicies.validMagicLinkToken("a".repeat(43))).toBe(true);
    expect(authRoutePolicies.validMagicLinkToken("a".repeat(42))).toBe(false);
    expect(authRoutePolicies.validMagicLinkToken("a".repeat(42) + "+")).toBe(false);
  });

  it("accepts a standard Resend sender form and rejects unsafe sender values", () => {
    expect(authRoutePolicies.normaliseAuthSender("NSOS <onboarding@resend.dev>")).toBe("NSOS <onboarding@resend.dev>");
    expect(() => authRoutePolicies.normaliseAuthSender("NSOS <onboarding@resend.dev>\r\nBcc: attacker@example.com")).toThrow("not configured safely");
  });

  it("rejects route starts that do not provide a safe application origin", async () => {
    await withAuthRouteServer(async origin => {
      const googleResponse = await fetch(`${origin}/api/auth/google/start`, { redirect: "manual" });
      expect(googleResponse.status).toBe(400);
      const emailResponse = await fetch(`${origin}/api/auth/email/request`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "person@example.ng" }) });
      expect(emailResponse.status).toBe(400);
    });
  });

  it("starts Google sign-in only with a safe origin and issues a browser-bound state cookie", async () => {
    await withAuthRouteServer(async origin => {
      const response = await fetch(`${origin}/api/auth/google/start?origin=${encodeURIComponent("https://nsos-system-uhkdscaf.manus.space")}`, { redirect: "manual" });
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toContain("accounts.google.com/o/oauth2/v2/auth");
      expect(response.headers.get("set-cookie")).toContain("__Host-google_oauth_state=");
    });
  });

  it("rejects a Google callback whose state does not match the browser-bound cookie", async () => {
    await withAuthRouteServer(async origin => {
      const start = await requestRoute(`${origin}/api/auth/google/start?origin=${encodeURIComponent("https://nsos-system-uhkdscaf.manus.space")}`);
      const callback = await requestRoute(`${origin}/api/auth/google/callback?code=fake-code&state=wrong-state`, { headers: { cookie: String(start.headers["set-cookie"]) } });
      expect(callback.status).toBe(403);
      expect(callback.body).toContain("could not be verified");
    });
  });

  it("handles a failed Google provider exchange without creating a session", async () => {
    const providerFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }));
    vi.stubGlobal("fetch", providerFetch);
    await withAuthRouteServer(async origin => {
      const start = await requestRoute(`${origin}/api/auth/google/start?origin=${encodeURIComponent("https://nsos-system-uhkdscaf.manus.space")}`);
      const state = getGoogleState(start.headers["set-cookie"]);
      const callback = await requestRoute(`${origin}/api/auth/google/callback?code=fake-code&state=${encodeURIComponent(state.state)}`, { headers: { cookie: String(start.headers["set-cookie"]) } });
      expect(callback.status).toBe(502);
      expect(headerText(callback.headers["set-cookie"])).toContain("__Host-google_oauth_state=;");
      expect(providerFetch).toHaveBeenCalledTimes(1);
    });
  });

  it("accepts a passwordless-email request only after the provider accepts delivery", async () => {
    const token = "a".repeat(43);
    vi.spyOn(database, "createAuthMagicLink").mockResolvedValue(token);
    const providerFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email_123" }), { status: 200 }));
    vi.stubGlobal("fetch", providerFetch);
    await withAuthRouteServer(async origin => {
      const response = await requestRoute(`${origin}/api/auth/email/request`, { method: "POST", headers: { origin: "https://nsos-system-uhkdscaf.manus.space", "content-type": "application/json" }, body: JSON.stringify({ email: "parent@example.ng", origin: "https://nsos-system-uhkdscaf.manus.space" }) });
      expect(response.status).toBe(202);
      expect(response.body).toContain("sign-in links");
      expect(providerFetch).toHaveBeenCalledTimes(1);
    });
  });

  it("does not report passwordless-email delivery success when the provider rejects the request", async () => {
    vi.spyOn(database, "createAuthMagicLink").mockResolvedValue("a".repeat(43));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "provider unavailable" }), { status: 503 })));
    await withAuthRouteServer(async origin => {
      const response = await requestRoute(`${origin}/api/auth/email/request`, { method: "POST", headers: { origin: "https://nsos-system-uhkdscaf.manus.space", "content-type": "application/json" }, body: JSON.stringify({ email: "parent@example.ng", origin: "https://nsos-system-uhkdscaf.manus.space" }) });
      expect(response.status).toBe(503);
      expect(response.body).toContain("could not send");
    });
  });

  it("creates a session only once for a successfully consumed passwordless-email link", async () => {
    const consumeLink = vi.spyOn(database, "consumeAuthMagicLink").mockResolvedValue({ email: "parent@example.ng", redirectOrigin: "https://nsos-system-uhkdscaf.manus.space" } as any);
    vi.spyOn(database, "resolveExternalAuthIdentity").mockResolvedValue({ openId: "external:email:123", name: "Parent", email: "parent@example.ng" } as any);
    await withAuthRouteServer(async origin => {
      const first = await requestRoute(`${origin}/api/auth/email/verify?token=${"a".repeat(43)}`);
      expect(first.status).toBe(302);
      expect(first.headers.location).toBe("https://nsos-system-uhkdscaf.manus.space/");
      expect(headerText(first.headers["set-cookie"])).toContain("app_session_id=");
      consumeLink.mockRejectedValueOnce(new Error("used"));
      const repeated = await requestRoute(`${origin}/api/auth/email/verify?token=${"a".repeat(43)}`);
      expect(repeated.status).toBe(400);
      expect(repeated.body).toContain("invalid, expired, or already used");
    });
  });
});
