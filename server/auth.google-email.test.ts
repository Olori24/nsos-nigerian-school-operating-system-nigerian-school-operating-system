import express from "express";
import { createServer, request as httpRequest } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authRoutePolicies,
  registerEmailAuthRoutes,
  registerGoogleAuthRoutes,
  sendStudentPortalInvitationEmail,
} from "./auth";
import * as database from "./db";
import { normaliseAuthEmail } from "./db";
import * as welcomeEmails from "./welcomeEmail";

async function withAuthRouteServer<T>(run: (origin: string) => Promise<T>) {
  const app = express();
  app.use(express.json());
  registerGoogleAuthRoutes(app);
  registerEmailAuthRoutes(app);
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Test server did not bind to a local port.");
  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve()))
    );
  }
}

async function requestRoute(
  url: string,
  input: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
) {
  const target = new URL(url);
  return new Promise<{
    status: number;
    headers: Record<string, string | string[] | undefined>;
    body: string;
  }>((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method: input.method ?? "GET",
        headers: input.headers,
      },
      response => {
        const chunks: Buffer[] = [];
        response.on("data", chunk => chunks.push(Buffer.from(chunk)));
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          })
        );
      }
    );
    request.on("error", reject);
    if (input.body) request.write(input.body);
    request.end();
  });
}

function getGoogleState(setCookie: string | string[] | undefined) {
  return getGoogleStates(setCookie)[0];
}

function getGoogleStates(setCookie: string | string[] | undefined) {
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const encodedState = cookie?.match(/__Host-google_oauth_state=([^;]+)/)?.[1];
  if (!encodedState) throw new Error("Google state cookie was not set.");
  const parsed = JSON.parse(decodeURIComponent(encodedState)) as {
    state?: string;
    origin?: string;
    entries?: Array<{ state: string; origin: string }>;
  };
  return (
    parsed.entries ??
    (parsed.state && parsed.origin
      ? [{ state: parsed.state, origin: parsed.origin }]
      : [])
  );
}

function headerText(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.join("\n") : (value ?? "");
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("external authentication policy", () => {
  it("normalises a valid passwordless-email address", () => {
    expect(normaliseAuthEmail("  ADMIN@Greener-Future.edu.ng ")).toBe(
      "admin@greener-future.edu.ng"
    );
  });

  it("rejects malformed passwordless-email addresses", () => {
    expect(() => normaliseAuthEmail("not-an-email")).toThrow(
      "Enter a valid email address."
    );
  });

  it("allows only an exact HTTPS origin or a local HTTP development origin", () => {
    expect(
      authRoutePolicies.validOrigin("https://nsos-system-uhkdscaf.manus.space")
    ).toBe("https://nsos-system-uhkdscaf.manus.space");
    expect(authRoutePolicies.validOrigin("http://localhost:3000")).toBe(
      "http://localhost:3000"
    );
    expect(
      authRoutePolicies.validOrigin(
        "https://nsos-system-uhkdscaf.manus.space/unsafe-path"
      )
    ).toBeUndefined();
    expect(
      authRoutePolicies.validOrigin("http://school.example.ng")
    ).toBeUndefined();
  });

  it("requires an exact browser-bound OAuth state match", () => {
    expect(authRoutePolicies.matchesState("secure-state", "secure-state")).toBe(
      true
    );
    expect(authRoutePolicies.matchesState("secure-state", "other-state")).toBe(
      false
    );
    expect(authRoutePolicies.matchesState("secure-state", undefined)).toBe(
      false
    );
  });

  it("accepts only the expected one-time email-link token shape", () => {
    expect(authRoutePolicies.validMagicLinkToken("a".repeat(43))).toBe(true);
    expect(authRoutePolicies.validMagicLinkToken("a".repeat(42))).toBe(false);
    expect(authRoutePolicies.validMagicLinkToken("a".repeat(42) + "+")).toBe(
      false
    );
    expect(authRoutePolicies.validEmailVerificationToken("v".repeat(43))).toBe(
      true
    );
    expect(authRoutePolicies.validEmailVerificationToken("v".repeat(42))).toBe(
      false
    );
  });

  it("redirects a valid address-verification token to its stored safe origin", async () => {
    vi.spyOn(database, "consumeEmailVerificationToken").mockResolvedValue({
      userId: 301,
      redirectOrigin: "https://nsos-system-uhkdscaf.manus.space",
    });
    await withAuthRouteServer(async origin => {
      const response = await requestRoute(
        `${origin}/api/auth/email/verify-address?token=${"v".repeat(43)}`
      );
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(
        "https://nsos-system-uhkdscaf.manus.space/?email_verified=1"
      );
    });
  });

  it("rejects malformed or replayed address-verification tokens without redirecting", async () => {
    const consume = vi
      .spyOn(database, "consumeEmailVerificationToken")
      .mockRejectedValue(new Error("already used"));
    await withAuthRouteServer(async origin => {
      const malformed = await requestRoute(
        `${origin}/api/auth/email/verify-address?token=${"v".repeat(42)}`
      );
      expect(malformed.status).toBe(400);
      expect(consume).not.toHaveBeenCalled();
      const replayed = await requestRoute(
        `${origin}/api/auth/email/verify-address?token=${"v".repeat(43)}`
      );
      expect(replayed.status).toBe(400);
      expect(replayed.body).toContain("invalid or has expired");
    });
  });

  it("accepts a standard Resend sender form and rejects unsafe sender values", () => {
    expect(
      authRoutePolicies.normaliseAuthSender("NSOS <onboarding@resend.dev>")
    ).toBe("NSOS <onboarding@resend.dev>");
    expect(() =>
      authRoutePolicies.normaliseAuthSender(
        "NSOS <onboarding@resend.dev>\r\nBcc: attacker@example.com"
      )
    ).toThrow("not configured safely");
  });

  it("accepts the configured transactional sender without attempting delivery", () => {
    const sender = process.env.AUTH_EMAIL_FROM;
    expect(
      sender,
      "AUTH_EMAIL_FROM is required for passwordless email delivery."
    ).toBeTruthy();
    expect(authRoutePolicies.normaliseAuthSender(sender!)).toBe(sender!.trim());
  });

  it("rejects route starts that do not provide a safe application origin", async () => {
    await withAuthRouteServer(async origin => {
      const googleResponse = await fetch(`${origin}/api/auth/google/start`, {
        redirect: "manual",
      });
      expect(googleResponse.status).toBe(400);
      const emailResponse = await fetch(`${origin}/api/auth/email/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "person@example.ng" }),
      });
      expect(emailResponse.status).toBe(400);
    });
  });

  it("starts Google sign-in only with a safe origin and issues a browser-bound state cookie", async () => {
    await withAuthRouteServer(async origin => {
      const response = await fetch(
        `${origin}/api/auth/google/start?origin=${encodeURIComponent("https://nsos-system-uhkdscaf.manus.space")}`,
        { redirect: "manual" }
      );
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toContain(
        "accounts.google.com/o/oauth2/v2/auth"
      );
      expect(response.headers.get("set-cookie")).toContain(
        "__Host-google_oauth_state="
      );
    });
  });

  it("rejects a Google callback whose state does not match the browser-bound cookie", async () => {
    await withAuthRouteServer(async origin => {
      const start = await requestRoute(
        `${origin}/api/auth/google/start?origin=${encodeURIComponent("https://nsos-system-uhkdscaf.manus.space")}`
      );
      const callback = await requestRoute(
        `${origin}/api/auth/google/callback?code=fake-code&state=wrong-state`,
        { headers: { cookie: String(start.headers["set-cookie"]) } }
      );
      expect(callback.status).toBe(302);
      expect(callback.headers.location).toBe(
        "/?signIn=google_verification_failed"
      );
      expect(headerText(callback.headers["set-cookie"])).not.toContain(
        "__Host-google_oauth_state=;"
      );
    });
  });

  it("keeps a bounded set of separate pending Google states so one completed attempt does not invalidate another", async () => {
    const providerFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_grant" }), {
        status: 400,
      })
    );
    vi.stubGlobal("fetch", providerFetch);
    await withAuthRouteServer(async origin => {
      const first = await requestRoute(
        `${origin}/api/auth/google/start?origin=${encodeURIComponent("https://nsos.top")}`
      );
      const second = await requestRoute(
        `${origin}/api/auth/google/start?origin=${encodeURIComponent("https://nsos.top")}`,
        { headers: { cookie: String(first.headers["set-cookie"]) } }
      );
      const states = getGoogleStates(second.headers["set-cookie"]);
      expect(states).toHaveLength(2);
      const callback = await requestRoute(
        `${origin}/api/auth/google/callback?code=fake-code&state=${encodeURIComponent(states[1].state)}`,
        { headers: { cookie: String(second.headers["set-cookie"]) } }
      );
      expect(callback.status).toBe(502);
      expect(getGoogleStates(callback.headers["set-cookie"])[0].state).toBe(
        states[0].state
      );
    });
  });

  it("handles a failed Google provider exchange without creating a session", async () => {
    const providerFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_grant" }), {
        status: 400,
      })
    );
    vi.stubGlobal("fetch", providerFetch);
    await withAuthRouteServer(async origin => {
      const start = await requestRoute(
        `${origin}/api/auth/google/start?origin=${encodeURIComponent("https://nsos-system-uhkdscaf.manus.space")}`
      );
      const state = getGoogleState(start.headers["set-cookie"]);
      const callback = await requestRoute(
        `${origin}/api/auth/google/callback?code=fake-code&state=${encodeURIComponent(state.state)}`,
        { headers: { cookie: String(start.headers["set-cookie"]) } }
      );
      expect(callback.status).toBe(502);
      expect(headerText(callback.headers["set-cookie"])).toContain(
        "__Host-google_oauth_state=;"
      );
      expect(providerFetch).toHaveBeenCalledTimes(1);
    });
  });

  it("issues a short-lived non-sensitive success notice only after verified Google sign-in completes", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: "access-token" }), {
            status: 200,
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              sub: "google-subject",
              email: "school.user@example.ng",
              email_verified: true,
              name: "School User",
              picture: "https://lh3.googleusercontent.com/a/verified-profile",
            }),
            { status: 200 }
          )
        )
    );
    const resolveIdentity = vi
      .spyOn(database, "resolveExternalAuthIdentity")
      .mockResolvedValue({
        id: 12,
        openId: "external:google:12",
        name: "School User",
        email: "school.user@example.ng",
        avatarUrl: "https://lh3.googleusercontent.com/a/verified-profile",
        loginMethod: "google",
      } as any);
    vi.spyOn(database, "createUserSession").mockResolvedValue(
      "google-test-session"
    );
    await withAuthRouteServer(async origin => {
      const start = await requestRoute(
        `${origin}/api/auth/google/start?origin=${encodeURIComponent("https://nsos-system-uhkdscaf.manus.space")}`
      );
      const state = getGoogleState(start.headers["set-cookie"]);
      const callback = await requestRoute(
        `${origin}/api/auth/google/callback?code=verified-code&state=${encodeURIComponent(state.state)}`,
        { headers: { cookie: String(start.headers["set-cookie"]) } }
      );
      expect(callback.status).toBe(302);
      expect(callback.headers.location).toBe(
        "https://nsos-system-uhkdscaf.manus.space/"
      );
      expect(headerText(callback.headers["set-cookie"])).toContain(
        "__Host-google_signin_notice=google_success"
      );
      expect(headerText(callback.headers["set-cookie"])).toContain(
        "Max-Age=60"
      );
      expect(resolveIdentity).toHaveBeenCalledWith(
        expect.objectContaining({
          avatarUrl: "https://lh3.googleusercontent.com/a/verified-profile",
        })
      );
    });
  });

  it("dispatches one welcome email for a newly created Google account before redirecting", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: "access-token" }), {
            status: 200,
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              sub: "new-google-subject",
              email: "new.google@example.ng",
              email_verified: true,
              name: "New Google User",
            }),
            { status: 200 }
          )
        )
    );
    vi.spyOn(database, "resolveExternalAuthIdentity").mockResolvedValue({
      id: 201,
      openId: "external:google:201",
      name: "New Google User",
      email: "new.google@example.ng",
      loginMethod: "google",
      isNewUser: true,
    } as any);
    vi.spyOn(database, "createUserSession").mockResolvedValue(
      "google-new-session"
    );
    const dispatch = vi
      .spyOn(welcomeEmails, "dispatchWelcomeEmailForNewAccount")
      .mockResolvedValue({ status: "sent" });
    await withAuthRouteServer(async origin => {
      const start = await requestRoute(
        `${origin}/api/auth/google/start?origin=${encodeURIComponent("https://nsos-system-uhkdscaf.manus.space")}`
      );
      const state = getGoogleState(start.headers["set-cookie"]);
      const callback = await requestRoute(
        `${origin}/api/auth/google/callback?code=new-code&state=${encodeURIComponent(state.state)}`,
        { headers: { cookie: String(start.headers["set-cookie"]) } }
      );
      expect(callback.status).toBe(302);
      expect(dispatch).toHaveBeenCalledWith({
        userId: 201,
        email: "new.google@example.ng",
        firstName: "New Google User",
        origin: "https://nsos-system-uhkdscaf.manus.space",
      });
    });
  });

  it("dispatches one welcome email for a newly created passwordless account before redirecting", async () => {
    vi.spyOn(database, "consumeAuthMagicLink").mockResolvedValue({
      email: "new.email@example.ng",
      redirectOrigin: "https://nsos-system-uhkdscaf.manus.space",
    } as any);
    vi.spyOn(database, "resolveExternalAuthIdentity").mockResolvedValue({
      id: 202,
      openId: "external:email:202",
      name: null,
      email: "new.email@example.ng",
      isNewUser: true,
    } as any);
    vi.spyOn(
      database,
      "acceptCopilotSetupAgentStaffInvitationsForVerifiedEmail"
    ).mockResolvedValue({ acceptedCount: 0 });
    vi.spyOn(
      database,
      "acceptGuardianPortalInvitationsForVerifiedEmail"
    ).mockResolvedValue({ acceptedCount: 0 });
    vi.spyOn(
      database,
      "acceptStudentPortalInvitationsForVerifiedEmail"
    ).mockResolvedValue({ acceptedCount: 0 });
    vi.spyOn(database, "createUserSession").mockResolvedValue(
      "email-new-session"
    );
    const dispatch = vi
      .spyOn(welcomeEmails, "dispatchWelcomeEmailForNewAccount")
      .mockResolvedValue({ status: "sent" });
    await withAuthRouteServer(async origin => {
      const response = await requestRoute(
        `${origin}/api/auth/email/verify?token=${"b".repeat(43)}`
      );
      expect(response.status).toBe(302);
      expect(dispatch).toHaveBeenCalledWith({
        userId: 202,
        email: "new.email@example.ng",
        firstName: null,
        origin: "https://nsos-system-uhkdscaf.manus.space",
      });
    });
  });

  it("accepts a passwordless-email request only after the provider accepts delivery", async () => {
    const token = "a".repeat(43);
    vi.spyOn(database, "createAuthMagicLink").mockResolvedValue(token);
    const providerFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "email_123" }), { status: 200 })
      );
    vi.stubGlobal("fetch", providerFetch);
    await withAuthRouteServer(async origin => {
      const response = await requestRoute(`${origin}/api/auth/email/request`, {
        method: "POST",
        headers: {
          origin: "https://nsos-system-uhkdscaf.manus.space",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "parent@example.ng",
          origin: "https://nsos-system-uhkdscaf.manus.space",
        }),
      });
      expect(response.status).toBe(202);
      expect(response.body).toContain("sign-in links");
      expect(providerFetch).toHaveBeenCalledTimes(1);
      expect(
        (providerFetch.mock.calls[0]?.[1] as RequestInit).signal
      ).toBeTruthy();
    });
  });

  it("sends a student invitation only through a trusted origin and the shared single-use email-link flow", async () => {
    vi.spyOn(database, "createAuthMagicLink").mockResolvedValue("c".repeat(43));
    const providerFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "student-invite_123" }), {
        status: 200,
      })
    );
    vi.stubGlobal("fetch", providerFetch);
    await expect(
      sendStudentPortalInvitationEmail({
        email: "learner@example.ng",
        studentName: "Learner",
        schoolName: "Example School",
        origin: "https://nsos-system-uhkdscaf.manus.space",
      })
    ).resolves.toBe("student-invite_123");
    expect(database.createAuthMagicLink).toHaveBeenCalledWith({
      email: "learner@example.ng",
      redirectOrigin: "https://nsos-system-uhkdscaf.manus.space",
    });
    const body = JSON.parse(
      String((providerFetch.mock.calls[0]?.[1] as RequestInit).body)
    ) as { to: string; subject: string; text: string; html: string };
    expect(body.to).toBe("learner@example.ng");
    expect(body.subject).toContain("student portal invitation");
    expect(body.text).toContain("c".repeat(43));
    expect(body.html).toContain("Open your student portal");
    await expect(
      sendStudentPortalInvitationEmail({
        email: "learner@example.ng",
        studentName: "Learner",
        schoolName: "Example School",
        origin: "https://example.ng/unsafe-path",
      })
    ).rejects.toThrow("valid application origin");
    expect(providerFetch).toHaveBeenCalledTimes(1);
  });

  it("does not report passwordless-email delivery success when the provider rejects the request", async () => {
    vi.spyOn(database, "createAuthMagicLink").mockResolvedValue("a".repeat(43));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "provider unavailable" }), {
          status: 503,
        })
      )
    );
    await withAuthRouteServer(async origin => {
      const response = await requestRoute(`${origin}/api/auth/email/request`, {
        method: "POST",
        headers: {
          origin: "https://nsos-system-uhkdscaf.manus.space",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "parent@example.ng",
          origin: "https://nsos-system-uhkdscaf.manus.space",
        }),
      });
      expect(response.status).toBe(503);
      expect(response.body).toContain("could not send");
    });
  });

  it("fails closed when the passwordless-email provider times out", async () => {
    vi.spyOn(database, "createAuthMagicLink").mockResolvedValue("a".repeat(43));
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(
          new DOMException("provider deadline exceeded", "TimeoutError")
        )
    );
    await withAuthRouteServer(async origin => {
      const response = await requestRoute(`${origin}/api/auth/email/request`, {
        method: "POST",
        headers: {
          origin: "https://nsos-system-uhkdscaf.manus.space",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "parent@example.ng",
          origin: "https://nsos-system-uhkdscaf.manus.space",
        }),
      });
      expect(response.status).toBe(503);
      expect(response.body).toContain("could not send");
    });
  });

  it("fails closed when the Google token provider times out", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(
          new DOMException("provider deadline exceeded", "TimeoutError")
        )
    );
    const createSession = vi.spyOn(database, "createUserSession");
    await withAuthRouteServer(async origin => {
      const start = await requestRoute(
        `${origin}/api/auth/google/start?origin=${encodeURIComponent("https://nsos-system-uhkdscaf.manus.space")}`
      );
      const state = getGoogleState(start.headers["set-cookie"]);
      const callback = await requestRoute(
        `${origin}/api/auth/google/callback?code=slow-code&state=${encodeURIComponent(state.state)}`,
        { headers: { cookie: String(start.headers["set-cookie"]) } }
      );
      expect(callback.status).toBe(502);
      expect(createSession).not.toHaveBeenCalled();
    });
  });

  it("creates a session only once for a successfully consumed passwordless-email link", async () => {
    const consumeLink = vi
      .spyOn(database, "consumeAuthMagicLink")
      .mockResolvedValue({
        email: "parent@example.ng",
        redirectOrigin: "https://nsos-system-uhkdscaf.manus.space",
      } as any);
    vi.spyOn(database, "resolveExternalAuthIdentity").mockResolvedValue({
      id: 123,
      openId: "external:email:123",
      name: "Parent",
      email: "parent@example.ng",
    } as any);
    const acceptStaffInvitations = vi
      .spyOn(
        database,
        "acceptCopilotSetupAgentStaffInvitationsForVerifiedEmail"
      )
      .mockResolvedValue({ acceptedCount: 0 });
    const acceptGuardianInvitations = vi
      .spyOn(database, "acceptGuardianPortalInvitationsForVerifiedEmail")
      .mockResolvedValue({ acceptedCount: 0 });
    const acceptStudentInvitations = vi
      .spyOn(database, "acceptStudentPortalInvitationsForVerifiedEmail")
      .mockResolvedValue({ acceptedCount: 0 });
    const createSession = vi
      .spyOn(database, "createUserSession")
      .mockResolvedValue("test-session-id");
    await withAuthRouteServer(async origin => {
      const first = await requestRoute(
        `${origin}/api/auth/email/verify?token=${"a".repeat(43)}`
      );
      expect(first.status).toBe(302);
      expect(first.headers.location).toBe(
        "https://nsos-system-uhkdscaf.manus.space/"
      );
      expect(headerText(first.headers["set-cookie"])).toContain(
        "app_session_id="
      );
      expect(acceptStaffInvitations).toHaveBeenCalledWith({
        email: "parent@example.ng",
        userId: 123,
      });
      expect(acceptGuardianInvitations).toHaveBeenCalledWith({
        email: "parent@example.ng",
        userId: 123,
      });
      expect(acceptStudentInvitations).toHaveBeenCalledWith({
        email: "parent@example.ng",
        userId: 123,
      });
      consumeLink.mockRejectedValueOnce(new Error("used"));
      const repeated = await requestRoute(
        `${origin}/api/auth/email/verify?token=${"a".repeat(43)}`
      );
      expect(repeated.status).toBe(400);
      expect(repeated.body).toContain("invalid, expired, or already used");
      expect(createSession).toHaveBeenCalledTimes(1);
    });
  });
});
