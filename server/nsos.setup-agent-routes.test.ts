import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, getSchoolMembership: vi.fn(), getTenantOnboardingStatus: vi.fn(), consumeSharedRateLimit: vi.fn(), runCopilotSetupAgentAcademicFoundation: vi.fn(), listCopilotSetupAgentHistory: vi.fn() };
});

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const user = { id: 91, openId: "setup-owner", name: "Setup Owner", email: "owner@example.com", loginMethod: "email", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const membership = { id: 1, schoolId: 7, userId: 91, role: "owner", status: "active", createdAt: new Date(), updatedAt: new Date() };
const input = { schoolId: 7, sessionName: "2026/2027 Session", sessionStartsOn: "2026-09-01", sessionEndsOn: "2027-07-31", termName: "First Term", termStartsOn: "2026-09-01", termEndsOn: "2026-12-18", classes: [{ name: "Primary 1" }], templateId: "basic_primary" as const, includeOptional: false, confirmed: true as const };
function caller() { return appRouter.createCaller({ user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] }); }

describe("NSOS supervised setup agent routes", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(db.getSchoolMembership).mockResolvedValue(membership as any); vi.mocked(db.consumeSharedRateLimit).mockResolvedValue({ allowed: true, retryAfterSeconds: 0 } as any); });

  it("assesses setup only for an active owner or administrator", async () => {
    vi.mocked(db.getTenantOnboardingStatus).mockResolvedValue({ completionPercent: 0, completedSteps: 0, totalSteps: 6, steps: [{ id: "school-profile", label: "School profile", description: "", completed: true }, { id: "academic-foundation", label: "Academic foundation", description: "", completed: false, destination: "academics", actionLabel: "Set up academics" }, { id: "team", label: "First team member", description: "", completed: false, destination: "staff", actionLabel: "Add staff" }, { id: "learners", label: "First learner", description: "", completed: false, destination: "students", actionLabel: "Add learner" }, { id: "fees", label: "Finance & bank account", description: "", completed: false, destination: "finance", actionLabel: "Set up finance" }, { id: "public-presence", label: "School website", description: "", completed: false, destination: "website", actionLabel: "Prepare website" }] } as any);
    await expect(caller().nsos.setupAgent.assess({ schoolId: 7 })).resolves.toMatchObject({ completionPercent: 0 });
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ ...membership, role: "teacher" } as any);
    await expect(caller().nsos.setupAgent.assess({ schoolId: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires an explicit confirmation and routes approved real academic details to the audited setup service", async () => {
    vi.mocked(db.runCopilotSetupAgentAcademicFoundation).mockResolvedValue({ sessionId: 1, termId: 2, classesCreated: 1, classIds: [3], curriculum: {} } as any);
    await expect(caller().nsos.setupAgent.applyAcademicFoundation(input)).resolves.toMatchObject({ sessionId: 1 });
    expect(db.runCopilotSetupAgentAcademicFoundation).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 7, executedBy: 91, classes: [{ name: "Primary 1" }], templateId: "basic_primary" }));
    await expect(caller().nsos.setupAgent.applyAcademicFoundation({ ...input, confirmed: false as any })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
