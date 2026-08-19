import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionDb = vi.hoisted(() => ({
  listActiveUserSessions: vi.fn(),
  listUserSecurityActivity: vi.fn(),
  updateUserSessionLocation: vi.fn(),
  revokeUserSession: vi.fn(),
  revokeOtherUserSessions: vi.fn(),
}));

vi.mock("./db", () => sessionDb);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(sessionId = "session-current"): TrpcContext {
  return {
    user: {
      id: 41,
      openId: "external:email:41",
      name: "Session Test User",
      email: "user@example.ng",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      sessionId,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("auth.sessions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks only the caller's matching active session as current", async () => {
    sessionDb.listActiveUserSessions.mockResolvedValue([
      { id: "session-current", deviceLabel: "Chrome on Windows device", deviceKind: "desktop", locationLabel: "Nigeria · Africa/Lagos", source: "email", createdAt: new Date(), lastSeenAt: new Date(), expiresAt: new Date(Date.now() + 86_400_000) },
      { id: "session-other", deviceLabel: "Safari on iPhone or iPad", deviceKind: "mobile", locationLabel: null, source: "email", createdAt: new Date(), lastSeenAt: new Date(), expiresAt: new Date(Date.now() + 86_400_000) },
    ]);
    const sessions = await appRouter.createCaller(context()).auth.sessions.list();
    expect(sessions.map(session => session.current)).toEqual([true, false]);
    expect(sessions.map(session => session.locationLabel)).toEqual(["Nigeria · Africa/Lagos", null]);
    expect(sessions.map(session => session.deviceKind)).toEqual(["desktop", "mobile"]);
    expect(sessionDb.listActiveUserSessions).toHaveBeenCalledWith(41);
  });

  it("returns only the caller's safe security activity history", async () => {
    sessionDb.listUserSecurityActivity.mockResolvedValue([{ id: 9, eventType: "session_revoked", deviceLabel: "Chrome on Windows device", locationLabel: "Nigeria · Africa/Lagos", source: "google", occurredAt: new Date("2026-08-19T08:00:00.000Z") }]);
    const history = await appRouter.createCaller(context()).auth.sessions.history({ limit: 20 });
    expect(history).toHaveLength(1);
    expect(history[0]).not.toHaveProperty("sessionId");
    expect(history[0]).not.toHaveProperty("userAgent");
    expect(sessionDb.listUserSecurityActivity).toHaveBeenCalledWith(41, 20);
  });

  it("refuses to revoke the current session from the device list", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.auth.sessions.revoke({ sessionId: "session-current" })).rejects.toThrow("Use Sign out");
    expect(sessionDb.revokeUserSession).not.toHaveBeenCalled();
  });

  it("revokes another active session only within the caller's account", async () => {
    sessionDb.revokeUserSession.mockResolvedValue(true);
    const result = await appRouter.createCaller(context()).auth.sessions.revoke({ sessionId: "session-other" });
    expect(result).toEqual({ success: true });
    expect(sessionDb.revokeUserSession).toHaveBeenCalledWith({ userId: 41, sessionId: "session-other", reason: "Revoked by account owner" });
  });

  it("records a validated coarse location only for the caller's current session", async () => {
    sessionDb.updateUserSessionLocation.mockResolvedValue(true);
    const result = await appRouter.createCaller(context()).auth.sessions.recordLocation({ timeZone: "Africa/Lagos" });
    expect(result).toEqual({ success: true });
    expect(sessionDb.updateUserSessionLocation).toHaveBeenCalledWith({ userId: 41, sessionId: "session-current", timeZone: "Africa/Lagos" });
  });

  it("signs out other devices while retaining the current session", async () => {
    sessionDb.revokeOtherUserSessions.mockResolvedValue(2);
    const result = await appRouter.createCaller(context()).auth.sessions.revokeOthers();
    expect(result).toEqual({ success: true, revokedCount: 2 });
    expect(sessionDb.revokeOtherUserSessions).toHaveBeenCalledWith({ userId: 41, currentSessionId: "session-current", reason: "Signed out from other devices" });
  });
});
