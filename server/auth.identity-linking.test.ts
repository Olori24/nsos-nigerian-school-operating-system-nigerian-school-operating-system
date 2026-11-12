import express from "express";
import { createServer, request as httpRequest } from "node:http";
import { parse as parseCookieHeader } from "cookie";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerEmailAuthRoutes, registerGoogleAuthRoutes } from "./auth";
import * as database from "./db";
import { sdk } from "./_core/sdk";

const user = {
  id: 44,
  openId: "legacy-user-open-id",
  name: "School Owner",
  email: "owner@example.ng",
  loginMethod: "manus",
  role: "user",
  sessionId: "legacy-session-44",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const allowRateLimit = () => (_req: any, _res: any, next: () => void) => next();

async function withServer<T>(run: (origin: string) => Promise<T>) {
  const app = express();
  app.use(express.json());
  registerGoogleAuthRoutes(app, allowRateLimit as any);
  registerEmailAuthRoutes(app, allowRateLimit as any);
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind.");
  try {
    return await run("http://127.0.0.1:" + address.port);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

async function requestRoute(url: string, input: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  const target = new URL(url);
  return new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }>((resolve, reject) => {
    const request = httpRequest({
      hostname: target.hostname,
      port: target.port,
      path: target.pathname + target.search,
      method: input.method ?? "GET",
      headers: input.headers,
    }, response => {
      const chunks: Buffer[] = [];
      response.on("data", chunk => chunks.push(Buffer.from(chunk)));
      response.on("end", () => resolve({
        status: response.statusCode ?? 0,
        headers: response.headers,
        body: Buffer.concat(chunks).toString("utf8"),
      }));
    });
    request.on("error", reject);
    if (input.body) request.write(input.body);
    request.end();
  });
}

function cookiePair(headers: Record<string, string | string[] | undefined>, name: string) {
  const values = headers["set-cookie"];
  const all = Array.isArray(values) ? values : [String(values ?? "")];
  const value = all.find(item => item.startsWith(name + "="));
  if (!value) throw new Error("Expected cookie " + name);
  return value.split(";", 1)[0]!;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("explicit legacy account identity linking", () => {
  it("links a verified Google identity to the already-authenticated NSOS user without creating a new user session", async () => {
    vi.spyOn(sdk, "authenticateRequest").mockResolvedValue(user as any);
    const linkIdentity = vi.spyOn(database, "linkExternalAuthIdentity").mockResolvedValue(user as any);
    const createSession = vi.spyOn(database, "createUserSession");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "google-access-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sub: "google-sub-44", email: "owner@example.ng", email_verified: true, name: "School Owner" }), { status: 200 })));

    await withServer(async origin => {
      const sessionCookie = "app_session_id=legacy-session-token";
      const start = await requestRoute(origin + "/api/auth/google/link/start?origin=" + encodeURIComponent("https://nsos.test"), { headers: { cookie: sessionCookie } });
      expect(start.status).toBe(302);
      const stateCookie = cookiePair(start.headers, "__Host-google_oauth_state");
      const state = JSON.parse(parseCookieHeader(stateCookie)["__Host-google_oauth_state"]!);

      const callback = await requestRoute(
        origin + "/api/auth/google/callback?code=verified-code&state=" + encodeURIComponent(state.state),
        { headers: { cookie: sessionCookie + "; " + stateCookie } },
      );

      expect(callback.status).toBe(302);
      expect(callback.headers.location).toBe("https://nsos.test/app?identityLinked=google");
      expect(linkIdentity).toHaveBeenCalledWith({
        userId: 44,
        provider: "google",
        providerSubject: "google-sub-44",
        email: "owner@example.ng",
      });
      expect(createSession).not.toHaveBeenCalled();
    });
  });

  it("does not create a duplicate account when a verified provider email belongs to a legacy NSOS user", async () => {
    const resolveIdentity = vi.spyOn(database, "resolveExternalAuthIdentity").mockRejectedValue(new Error("Existing NSOS accounts require explicit identity linking."));
    const createSession = vi.spyOn(database, "createUserSession");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "google-access-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sub: "google-sub-legacy", email: "owner@example.ng", email_verified: true }), { status: 200 })));

    await withServer(async origin => {
      const start = await requestRoute(origin + "/api/auth/google/start?origin=" + encodeURIComponent("https://nsos.test"));
      const stateCookie = cookiePair(start.headers, "__Host-google_oauth_state");
      const state = JSON.parse(parseCookieHeader(stateCookie)["__Host-google_oauth_state"]!);
      const callback = await requestRoute(
        origin + "/api/auth/google/callback?code=verified-code&state=" + encodeURIComponent(state.state),
        { headers: { cookie: stateCookie } },
      );

      expect(callback.status).toBe(409);
      expect(callback.body).toContain("Sign in to that account");
      expect(resolveIdentity).toHaveBeenCalledOnce();
      expect(createSession).not.toHaveBeenCalled();
    });
  });

  it("links a verified email identity only in the same authenticated browser session", async () => {
    vi.spyOn(sdk, "authenticateRequest").mockResolvedValue(user as any);
    vi.spyOn(database, "createAuthMagicLink").mockResolvedValue("m".repeat(43));
    vi.spyOn(database, "consumeAuthMagicLink").mockResolvedValue({ email: "owner@example.ng", redirectOrigin: "https://nsos.test" } as any);
    const linkIdentity = vi.spyOn(database, "linkExternalAuthIdentity").mockResolvedValue(user as any);
    const createSession = vi.spyOn(database, "createUserSession");
    const providerFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "resend-email-1" }), { status: 200 }));
    vi.stubGlobal("fetch", providerFetch);

    await withServer(async origin => {
      const sessionCookie = "app_session_id=legacy-session-token";
      const start = await requestRoute(origin + "/api/auth/email/link/request", {
        method: "POST",
        headers: { cookie: sessionCookie, origin: "https://nsos.test", "content-type": "application/json" },
        body: JSON.stringify({ email: "owner@example.ng", origin: "https://nsos.test" }),
      });
      expect(start.status).toBe(202);
      const stateCookie = cookiePair(start.headers, "__Host-email_link_state");
      const emailPayload = JSON.parse(String((providerFetch.mock.calls[0]?.[1] as RequestInit).body));
      const emailText = String(emailPayload.text);
      const linkText = emailText.slice(emailText.lastIndexOf(": ") + 2);
      const link = new URL(linkText);
      const state = link.searchParams.get("state");

      const verify = await requestRoute(origin + link.pathname + link.search, { headers: { cookie: sessionCookie + "; " + stateCookie } });

      expect(verify.status).toBe(302);
      expect(verify.headers.location).toBe("https://nsos.test/app?identityLinked=email");
      expect(linkIdentity).toHaveBeenCalledWith({
        userId: 44,
        provider: "email",
        providerSubject: "owner@example.ng",
        email: "owner@example.ng",
      });
      expect(createSession).not.toHaveBeenCalled();
      expect(state).toBeTruthy();
    });
  });
});
