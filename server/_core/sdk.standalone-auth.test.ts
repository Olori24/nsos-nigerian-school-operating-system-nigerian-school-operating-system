import { COOKIE_NAME } from "@shared/const";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as database from "../db";
import { sdk } from "./sdk";

afterEach(() => vi.restoreAllMocks());

describe("standalone NSOS session authentication", () => {
  it("authenticates an existing local account without calling the external OAuth service", async () => {
    const user = {
      id: 901,
      openId: "local-user-901",
      name: "School Owner",
      email: "owner@example.ng",
      loginMethod: "google",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    vi.spyOn(database, "getUserByOpenId").mockResolvedValue(user as any);
    vi.spyOn(database, "upsertUser").mockResolvedValue(undefined);
    vi.spyOn(database, "ensureActiveUserSession").mockResolvedValue(true);

    const token = await sdk.createSessionToken(user.openId, { name: user.name, sessionId: "session-901" });
    const req = {
      headers: { cookie: COOKIE_NAME + "=" + token },
      get: () => "NSOS auth test",
    } as any;
    const authenticated = await sdk.authenticateRequest(req);

    expect(authenticated.id).toBe(user.id);
    expect(authenticated.sessionId).toBe("session-901");
    expect(database.ensureActiveUserSession).toHaveBeenCalledWith(expect.objectContaining({ userId: user.id, sessionId: "session-901" }));
  });

  it("fails closed when a signed session has no corresponding local NSOS account", async () => {
    vi.spyOn(database, "getUserByOpenId").mockResolvedValue(undefined);
    const ensureSession = vi.spyOn(database, "ensureActiveUserSession");
    const token = await sdk.createSessionToken("missing-local-user", { name: "Missing", sessionId: "session-missing" });
    const req = { headers: { cookie: COOKIE_NAME + "=" + token }, get: () => "NSOS auth test" } as any;

    await expect(sdk.authenticateRequest(req)).rejects.toThrow("NSOS account not found");
    expect(externalLookup).not.toHaveBeenCalled();
    expect(ensureSession).not.toHaveBeenCalled();
  });

  it("continues to reject a revoked local session", async () => {
    const user = {
      id: 902,
      openId: "local-user-902",
      name: "School Owner",
      email: "owner2@example.ng",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    vi.spyOn(database, "getUserByOpenId").mockResolvedValue(user as any);
    vi.spyOn(database, "upsertUser").mockResolvedValue(undefined);
    vi.spyOn(database, "ensureActiveUserSession").mockResolvedValue(false);
    const token = await sdk.createSessionToken(user.openId, { name: user.name, sessionId: "revoked-session-902" });
    const req = { headers: { cookie: COOKIE_NAME + "=" + token }, get: () => "NSOS auth test" } as any;

    await expect(sdk.authenticateRequest(req)).rejects.toThrow("Session has been revoked");
  });
});
