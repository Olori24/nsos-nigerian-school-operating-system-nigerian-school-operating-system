import { createServer, request as httpRequest } from "node:http";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

const { dispatchWelcomeEmail } = vi.hoisted(() => ({
  dispatchWelcomeEmail: vi.fn(),
}));

vi.mock("./welcomeEmail", async importOriginal => {
  const actual = await importOriginal<typeof import("./welcomeEmail")>();
  return { ...actual, dispatchWelcomeEmailForNewAccount: dispatchWelcomeEmail };
});

import { registerEmailAuthRoutes } from "./auth";
import * as database from "./db";

async function withHarnessServer<T>(run: (origin: string) => Promise<T>) {
  const app = express();
  app.use(express.json());
  registerEmailAuthRoutes(app);
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Harness server did not bind to a local port.");
  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve()))
    );
  }
}

async function requestRoute(url: string) {
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
        method: "GET",
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
    request.end();
  });
}

describe("isolated welcome-registration harness", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    dispatchWelcomeEmail.mockReset();
  });

  it("drives passwordless registration through a local HTTP server without the dashboard", async () => {
    vi.spyOn(database, "consumeAuthMagicLink").mockResolvedValue({
      email: "registration-harness@example.test",
      redirectOrigin: "https://nsos.top",
    } as any);
    vi.spyOn(database, "resolveExternalAuthIdentity").mockResolvedValue({
      id: 910001,
      openId: "harness:email:910001",
      name: "Amina Harness",
      email: "registration-harness@example.test",
      isNewUser: true,
    } as any);
    vi.spyOn(
      database,
      "acceptCopilotSetupAgentStaffInvitationsForVerifiedEmail"
    ).mockResolvedValue({ acceptedCount: 0 });
    vi.spyOn(database, "acceptGuardianPortalInvitationsForVerifiedEmail")
      .mockResolvedValue({ acceptedCount: 0 });
    vi.spyOn(database, "createUserSession").mockResolvedValue(
      "harness-session"
    );
    dispatchWelcomeEmail.mockResolvedValue({
      status: "sent",
      providerMessageId: "harness-provider-id",
    });

    await withHarnessServer(async origin => {
      const response = await requestRoute(
        `${origin}/api/auth/email/verify?token=${"a".repeat(43)}`
      );
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe("https://nsos.top/");
      expect(dispatchWelcomeEmail).toHaveBeenCalledWith({
        userId: 910001,
        email: "registration-harness@example.test",
        firstName: "Amina Harness",
        origin: "https://nsos.top",
      });
    });
  });

  it("keeps registration successful when the deterministic provider stub fails", async () => {
    vi.spyOn(database, "consumeAuthMagicLink").mockResolvedValue({
      email: "provider-failure@example.test",
      redirectOrigin: "https://nsos.top",
    } as any);
    vi.spyOn(database, "resolveExternalAuthIdentity").mockResolvedValue({
      id: 910002,
      openId: "harness:email:910002",
      name: "Provider Failure",
      email: "provider-failure@example.test",
      isNewUser: true,
    } as any);
    vi.spyOn(
      database,
      "acceptCopilotSetupAgentStaffInvitationsForVerifiedEmail"
    ).mockResolvedValue({ acceptedCount: 0 });
    vi.spyOn(database, "acceptGuardianPortalInvitationsForVerifiedEmail")
      .mockResolvedValue({ acceptedCount: 0 });
    vi.spyOn(database, "createUserSession").mockResolvedValue(
      "harness-session-2"
    );
    dispatchWelcomeEmail.mockResolvedValue({ status: "failed" });

    await withHarnessServer(async origin => {
      const response = await requestRoute(
        `${origin}/api/auth/email/verify?token=${"c".repeat(43)}`
      );
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe("https://nsos.top/");
      expect(dispatchWelcomeEmail).toHaveBeenCalledTimes(1);
    });
  });

  it("exercises the separate Verify Email callback and rejects replay", async () => {
    const consume = vi
      .spyOn(database, "consumeEmailVerificationToken")
      .mockResolvedValue({
        redirectOrigin: "https://nsos.top",
        userId: 910001,
      } as any);

    await withHarnessServer(async origin => {
      const token = "b".repeat(43);
      const verified = await requestRoute(
        `${origin}/api/auth/email/verify-address?token=${token}`
      );
      expect(verified.status).toBe(302);
      expect(verified.headers.location).toBe(
        "https://nsos.top/?email_verified=1"
      );

      consume.mockRejectedValueOnce(new Error("already used"));
      const replay = await requestRoute(
        `${origin}/api/auth/email/verify-address?token=${token}`
      );
      expect(replay.status).toBe(400);
      expect(replay.body).toContain("invalid or has expired");
    });
  });
});
