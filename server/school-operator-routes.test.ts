import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ getSchoolMembership: vi.fn(), consumeSharedRateLimit: vi.fn(), getSchoolOperatorWorkspace: vi.fn(), refreshSchoolOperatorInsights: vi.fn(), saveInstitutionOperatingProfile: vi.fn(), saveSchoolOperatorWorkflowPreferences: vi.fn(), dismissSchoolOperatorInsight: vi.fn(), recordSecurityAuditEvent: vi.fn() }));
vi.mock("./db", async importOriginal => ({ ...(await importOriginal<typeof import("./db")>()), ...db }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const user = { id: 116, openId: "operator-owner", name: "Operator Owner", email: "owner@example.com", loginMethod: "email", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const membership = { id: 7, schoolId: 34, userId: 116, role: "owner", status: "active", createdAt: new Date(), updatedAt: new Date() };
const caller = () => appRouter.createCaller({ user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("NSOS School Operator routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.getSchoolMembership.mockResolvedValue(membership);
    db.consumeSharedRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    db.getSchoolOperatorWorkspace.mockResolvedValue({ profile: { schoolId: 34 }, workflowPreferences: { schoolId: 34, reviewFocus: "balanced", reviewCadence: "weekly", evidenceDetail: "standard", showDismissedInsights: false }, dashboard: { activeStudents: 12, pendingAdmissions: 1, attendanceRate: 82, outstanding: 0 }, onboarding: { completionPercent: 50 }, commandCenter: {}, insights: [], source: "deterministic-v1", limitations: [] });
    db.refreshSchoolOperatorInsights.mockResolvedValue([{ id: 91, schoolId: 34, insightType: "learning", severity: "info", status: "open", title: "Active learning delivery is visible", detail: "Review Learning Centre.", evidence: { metric: "active_programme_enrolments", value: 3, source: "program_enrolments" }, actionDestination: "learning" }]);
    db.saveInstitutionOperatingProfile.mockResolvedValue({ schoolId: 34, mission: "Teach practical skills", updatedBy: 116 });
    db.saveSchoolOperatorWorkflowPreferences.mockResolvedValue({ schoolId: 34, reviewFocus: "learning", reviewCadence: "weekly", evidenceDetail: "standard", showDismissedInsights: true, updatedBy: 116 });
    db.dismissSchoolOperatorInsight.mockResolvedValue([]);
    db.recordSecurityAuditEvent.mockResolvedValue(undefined);
  });

  it("returns only the authorised tenant workspace and blocks non-management roles", async () => {
    await expect(caller().nsos.schoolOperator.workspace({ schoolId: 34 })).resolves.toMatchObject({ source: "deterministic-v1", dashboard: { activeStudents: 12 } });
    expect(db.getSchoolOperatorWorkspace).toHaveBeenCalledWith(34);
    db.getSchoolMembership.mockResolvedValue({ ...membership, role: "teacher" });
    await expect(caller().nsos.schoolOperator.workspace({ schoolId: 34 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires confirmation and rate permission before refreshing private aggregate insights, with no raw learner data or side effect in audit metadata", async () => {
    await expect(caller().nsos.schoolOperator.refresh({ schoolId: 34, confirmed: true })).resolves.toHaveLength(1);
    expect(db.refreshSchoolOperatorInsights).toHaveBeenCalledWith(34);
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "school_operator_insights_refreshed", metadata: expect.objectContaining({ confirmationRequired: true, source: "deterministic-v1", rawLearnerDataIncluded: false, publicAction: false, messageSent: false, paymentAction: false, academicChanged: false, credentialIssued: false }) }));
    await expect(caller().nsos.schoolOperator.refresh({ schoolId: 34, confirmed: false as any })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    db.consumeSharedRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 33 });
    await expect(caller().nsos.schoolOperator.refresh({ schoolId: 34, confirmed: true })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(db.refreshSchoolOperatorInsights).toHaveBeenCalledTimes(1);
  });

  it("saves only confirmed owner-approved operating memory and audits field counts without storing the raw context", async () => {
    const profile = { mission: "Teach practical skills", targetLearners: "Adult beginners", brandTone: "Warm and practical" };
    await expect(caller().nsos.schoolOperator.saveProfile({ schoolId: 34, profile, confirmed: true })).resolves.toMatchObject({ schoolId: 34 });
    expect(db.saveInstitutionOperatingProfile).toHaveBeenCalledWith({ schoolId: 34, updatedBy: 116, profile });
    expect(JSON.stringify(db.recordSecurityAuditEvent.mock.calls)).not.toContain(profile.mission);
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "school_operator_profile_saved", metadata: expect.objectContaining({ confirmationRequired: true, fieldsProvided: 3, rawProfileTextStoredInAudit: false, publicAction: false, messageSent: false, paymentAction: false, academicChanged: false, credentialIssued: false }) }));
  });

  it("saves only confirmed bounded workflow-review preferences without creating a schedule or relaxing approval boundaries", async () => {
    const preferences = { reviewFocus: "learning" as const, reviewCadence: "weekly" as const, evidenceDetail: "standard" as const, showDismissedInsights: true };
    await expect(caller().nsos.schoolOperator.saveWorkflowPreferences({ schoolId: 34, preferences, confirmed: true })).resolves.toMatchObject({ schoolId: 34, reviewFocus: "learning" });
    expect(db.consumeSharedRateLimit).toHaveBeenCalledWith(expect.objectContaining({ namespace: "nsos-school-operator", route: "workflow-preferences-save", clientKey: "34:116", limit: 8 }));
    expect(db.saveSchoolOperatorWorkflowPreferences).toHaveBeenCalledWith({ schoolId: 34, updatedBy: 116, preferences });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "school_operator_workflow_preferences_saved", metadata: expect.objectContaining({ confirmationRequired: true, reviewFocus: "learning", reviewCadence: "weekly", scheduleCreated: false, rulesBypassed: false, publicAction: false, messageSent: false, paymentAction: false, academicChanged: false, credentialIssued: false }) }));
    await expect(caller().nsos.schoolOperator.saveWorkflowPreferences({ schoolId: 34, preferences, confirmed: false as any })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    db.consumeSharedRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 33 });
    await expect(caller().nsos.schoolOperator.saveWorkflowPreferences({ schoolId: 34, preferences, confirmed: true })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(db.saveSchoolOperatorWorkflowPreferences).toHaveBeenCalledTimes(1);
  });

  it("allows a confirmed local insight dismissal but never turns dismissal into a recommendation execution", async () => {
    await expect(caller().nsos.schoolOperator.dismissInsight({ schoolId: 34, insightId: 91, confirmed: true })).resolves.toEqual([]);
    expect(db.dismissSchoolOperatorInsight).toHaveBeenCalledWith({ schoolId: 34, insightId: 91, dismissedBy: 116 });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "school_operator_insight_dismissed", metadata: expect.objectContaining({ localVisibilityChanged: true, publicAction: false, messageSent: false, paymentAction: false, academicChanged: false, credentialIssued: false }) }));
  });
});
