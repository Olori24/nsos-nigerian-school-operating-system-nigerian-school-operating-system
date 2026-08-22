import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ getSchoolMembership: vi.fn(), consumeSharedRateLimit: vi.fn(), getTenantOnboardingStatus: vi.fn(), getLearningOperatingType: vi.fn(), saveCopilotRecentSearch: vi.fn(), recordSecurityAuditEvent: vi.fn() }));
const setupAgent = vi.hoisted(() => ({ buildSetupAgentAssessment: vi.fn() }));
const concierge = vi.hoisted(() => ({ buildEnterpriseConciergePlan: vi.fn() }));
vi.mock("./db", () => db);
vi.mock("./setupAgent", () => setupAgent);
vi.mock("./enterpriseConcierge", () => concierge);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(): TrpcContext {
  return { user: { id: 91, openId: "concierge-user", name: "Concierge User", email: "user@example.ng", loginMethod: "email", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), sessionId: "concierge-session" }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("NSOS Enterprise Concierge route", () => {
  const safePlan = { reply: "Open Family portal.", action: { kind: "guidance", id: "portal", label: "Open Family portal", destination: "portal", requiresConfirmation: false }, nextSteps: ["Review linked family information."], guardrail: "This handoff respects your role.", source: "guided" as const };

  beforeEach(() => {
    vi.clearAllMocks();
    db.getSchoolMembership.mockResolvedValue({ schoolId: 16, userId: 91, role: "parent", status: "active" });
    db.consumeSharedRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 600 });
    db.getLearningOperatingType.mockResolvedValue("school");
    db.saveCopilotRecentSearch.mockResolvedValue(undefined);
    db.recordSecurityAuditEvent.mockResolvedValue(undefined);
    concierge.buildEnterpriseConciergePlan.mockResolvedValue(safePlan);
  });

  it("grounds a plan in the active school role, persists only the caller's recent prompt, and audits safe metadata", async () => {
    const privateRequest = "Show a particular guardian's outstanding invoice";
    const result = await appRouter.createCaller(context()).nsos.enterpriseConcierge.plan({ schoolId: 16, request: privateRequest });
    expect(result).toEqual(safePlan);
    expect(concierge.buildEnterpriseConciergePlan).toHaveBeenCalledWith({ request: privateRequest, role: "parent", assessment: undefined, operatingType: "school" });
    expect(db.getTenantOnboardingStatus).not.toHaveBeenCalled();
    expect(db.saveCopilotRecentSearch).toHaveBeenCalledWith({ userId: 91, schoolId: 16, query: privateRequest, destinationId: "portal" });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 16, actorUserId: 91, eventType: "enterprise_concierge_plan_generated", targetId: "portal", metadata: expect.not.objectContaining({ request: expect.anything() }) }));
    expect(JSON.stringify(db.recordSecurityAuditEvent.mock.calls)).not.toContain(privateRequest);
  });

  it("reads only the management readiness aggregate for a school owner and still returns a plan rather than executing a change", async () => {
    db.getSchoolMembership.mockResolvedValue({ schoolId: 16, userId: 91, role: "owner", status: "active" });
    db.getLearningOperatingType.mockResolvedValue("online_training_provider");
    db.getTenantOnboardingStatus.mockResolvedValue({ schoolId: 16, readiness: "safe aggregate" });
    const assessment = { completionPercent: 45, actions: [] };
    setupAgent.buildSetupAgentAssessment.mockReturnValue(assessment);
    concierge.buildEnterpriseConciergePlan.mockResolvedValue({ ...safePlan, action: { kind: "prepare", id: "finance", label: "Prepare finance", destination: null, requiresConfirmation: true } });
    const result = await appRouter.createCaller(context()).nsos.enterpriseConcierge.plan({ schoolId: 16, request: "Prepare our approved term fees" });
    expect(db.getTenantOnboardingStatus).toHaveBeenCalledWith(16);
    expect(concierge.buildEnterpriseConciergePlan).toHaveBeenCalledWith(expect.objectContaining({ role: "owner", assessment, operatingType: "online_training_provider" }));
    expect(result.action.requiresConfirmation).toBe(true);
    expect(result.action.kind).toBe("prepare");
  });

  it("rejects an inactive or cross-tenant caller before plan generation", async () => {
    db.getSchoolMembership.mockResolvedValue(undefined);
    await expect(appRouter.createCaller(context()).nsos.enterpriseConcierge.plan({ schoolId: 16, request: "Set up our term" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(concierge.buildEnterpriseConciergePlan).not.toHaveBeenCalled();
  });

  it("enforces the per-user, per-school request ceiling before model planning", async () => {
    db.consumeSharedRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 217 });
    await expect(appRouter.createCaller(context()).nsos.enterpriseConcierge.plan({ schoolId: 16, request: "Set up our term" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(concierge.buildEnterpriseConciergePlan).not.toHaveBeenCalled();
  });

  it("rejects blank or oversized prompt input before reaching the planning service", async () => {
    await expect(appRouter.createCaller(context()).nsos.enterpriseConcierge.plan({ schoolId: 16, request: " " })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(appRouter.createCaller(context()).nsos.enterpriseConcierge.plan({ schoolId: 16, request: "x".repeat(601) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(concierge.buildEnterpriseConciergePlan).not.toHaveBeenCalled();
  });
});
