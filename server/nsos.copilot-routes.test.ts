import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ getSchoolMembership: vi.fn(), consumeSharedRateLimit: vi.fn(), recordSecurityAuditEvent: vi.fn() }));
const copilot = vi.hoisted(() => ({ getCopilotGuidance: vi.fn(), destinationsForRole: vi.fn() }));
vi.mock("./db", () => db);
vi.mock("./copilot", () => copilot);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(): TrpcContext {
  return { user: { id: 71, openId: "copilot-user", name: "Copilot User", email: "user@example.ng", loginMethod: "email", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), sessionId: "copilot-session" }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("NSOS Copilot route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.getSchoolMembership.mockResolvedValue({ schoolId: 12, userId: 71, role: "parent", status: "active" });
    db.consumeSharedRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 600 });
    copilot.destinationsForRole.mockReturnValue([{ id: "portal", label: "Family portal", description: "View linked family information." }]);
    copilot.getCopilotGuidance.mockResolvedValue({ reply: "Open Family portal.", destination: "portal", suggestions: ["Account & security"], source: "guided" });
  });

  it("uses the active school membership role and audits only safe Copilot metadata", async () => {
    const secretQuestion = "Where is a particular learner’s invoice?";
    const result = await appRouter.createCaller(context()).nsos.copilot.ask({ schoolId: 12, message: secretQuestion });
    expect(copilot.getCopilotGuidance).toHaveBeenCalledWith({ role: "parent", message: secretQuestion });
    expect(result.destinations).toEqual([{ id: "portal", label: "Family portal", description: "View linked family information." }]);
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 12, actorUserId: 71, eventType: "copilot_navigation_requested", metadata: expect.not.objectContaining({ message: expect.anything() }) }));
    expect(JSON.stringify(db.recordSecurityAuditEvent.mock.calls)).not.toContain(secretQuestion);
  });

  it("rejects users without an active school membership before calling the Copilot", async () => {
    db.getSchoolMembership.mockResolvedValue(undefined);
    await expect(appRouter.createCaller(context()).nsos.copilot.ask({ schoolId: 12, message: "Where should I go?" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(copilot.getCopilotGuidance).not.toHaveBeenCalled();
  });

  it("enforces the Copilot request ceiling before invoking the model", async () => {
    db.consumeSharedRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 321 });
    await expect(appRouter.createCaller(context()).nsos.copilot.ask({ schoolId: 12, message: "Where should I go?" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(copilot.getCopilotGuidance).not.toHaveBeenCalled();
  });
});
