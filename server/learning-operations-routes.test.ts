import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ getSchoolMembership: vi.fn(), consumeSharedRateLimit: vi.fn(), getLearningOperationsWorkspace: vi.fn(), updateLearningOperatingType: vi.fn(), createLearningProgram: vi.fn(), activateLearningProgram: vi.fn(), createProgramCurriculumModule: vi.fn(), activateProgramCurriculumModule: vi.fn(), createProgramCurriculumMilestone: vi.fn(), activateProgramCurriculumMilestone: vi.fn(), recordProgramMilestoneProgress: vi.fn(), createProgramCohort: vi.fn(), assignProgramInstructor: vi.fn(), enrolLearnerInProgram: vi.fn(), confirmProgramCompletion: vi.fn(), recordProgramAttendance: vi.fn(), createProgramFeeStructure: vi.fn(), activateProgramFeeStructure: vi.fn(), recordSecurityAuditEvent: vi.fn() }));
vi.mock("./db", () => db);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(): TrpcContext {
  return { user: { id: 116, openId: "learning-owner", name: "Learning Owner", email: "owner@example.ng", loginMethod: "email", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), sessionId: "learning-session" }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("NSOS learning operations routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.getSchoolMembership.mockResolvedValue({ schoolId: 34, userId: 116, role: "owner", status: "active" });
    db.consumeSharedRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 600 });
    db.getLearningOperationsWorkspace.mockResolvedValue({ operatingType: "vocational_institute", programs: [], cohorts: [], assignments: [], enrolments: [], attendance: [], fees: [], modules: [], milestones: [], milestoneProgress: [], staff: [], learners: [] });
    db.updateLearningOperatingType.mockResolvedValue({ success: true, operatingType: "vocational_institute" });
    db.createLearningProgram.mockResolvedValue({ programId: 501, status: "draft" });
    db.activateLearningProgram.mockResolvedValue({ success: true, status: "active" });
    db.createProgramCurriculumModule.mockResolvedValue({ moduleId: 551, status: "draft" });
    db.activateProgramCurriculumModule.mockResolvedValue({ success: true, status: "active" });
    db.createProgramCurriculumMilestone.mockResolvedValue({ milestoneId: 561, status: "draft" });
    db.activateProgramCurriculumMilestone.mockResolvedValue({ success: true, status: "active" });
    db.recordProgramMilestoneProgress.mockResolvedValue({ success: true, enrollmentId: 801, milestoneId: 561, status: "reviewed_complete" });
    db.createProgramCohort.mockResolvedValue({ cohortId: 601, status: "planning" });
    db.assignProgramInstructor.mockResolvedValue({ assignmentId: 701, status: "active" });
    db.enrolLearnerInProgram.mockResolvedValue({ enrollmentId: 801, status: "active" });
    db.confirmProgramCompletion.mockResolvedValue({ success: true, status: "completed" });
    db.recordProgramAttendance.mockResolvedValue({ success: true, enrollmentId: 801, attendanceDate: "2026-08-22", status: "present" });
    db.createProgramFeeStructure.mockResolvedValue({ feeStructureId: 901, status: "draft" });
    db.activateProgramFeeStructure.mockResolvedValue({ success: true, status: "active" });
  });

  it("returns only the active tenant workspace to an owner or administrator", async () => {
    await expect(appRouter.createCaller(context()).nsos.learningOperations.workspace({ schoolId: 34 })).resolves.toMatchObject({ operatingType: "vocational_institute" });
    expect(db.getLearningOperationsWorkspace).toHaveBeenCalledWith(34);
  });

  it("requires explicit confirmation before changing the tenant operating type", async () => {
    await expect(appRouter.createCaller(context()).nsos.learningOperations.setOperatingType({ schoolId: 34, operatingType: "vocational_institute", confirmed: true })).resolves.toEqual({ success: true, operatingType: "vocational_institute" });
    expect(db.updateLearningOperatingType).toHaveBeenCalledWith({ schoolId: 34, operatingType: "vocational_institute", confirmed: true });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "learning_operating_type_updated", metadata: { operatingType: "vocational_institute", confirmationRequired: true } }));
  });

  it("creates programme drafts with confirmation and records only safe operational audit metadata", async () => {
    const privateDescription = "private commercial outline";
    await appRouter.createCaller(context()).nsos.learningOperations.createProgram({ schoolId: 34, title: "Fashion Design", description: privateDescription, deliveryMode: "in_person", confirmed: true });
    expect(db.createLearningProgram).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 34, title: "Fashion Design", createdBy: 116, confirmed: true }));
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "learning_program_draft_created", targetId: 501, metadata: expect.not.objectContaining({ title: expect.anything(), description: expect.anything() }) }));
    expect(JSON.stringify(db.recordSecurityAuditEvent.mock.calls)).not.toContain(privateDescription);
  });

  it("creates and activates internal curriculum modules and milestones only with explicit review confirmations", async () => {
    const caller = appRouter.createCaller(context()).nsos.learningOperations;
    await caller.createCurriculumModule({ schoolId: 34, programId: 501, title: "Pattern drafting", learningType: "practical", sortOrder: 1, confirmed: true });
    await caller.activateCurriculumModule({ schoolId: 34, moduleId: 551, confirmed: true });
    await caller.createCurriculumMilestone({ schoolId: 34, programId: 501, moduleId: 551, title: "Measure and mark", sortOrder: 1, confirmed: true });
    await caller.activateCurriculumMilestone({ schoolId: 34, milestoneId: 561, confirmed: true });
    expect(db.createProgramCurriculumModule).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 34, programId: 501, createdBy: 116, learningType: "practical" }));
    expect(db.createProgramCurriculumMilestone).toHaveBeenCalledWith(expect.objectContaining({ moduleId: 551, createdBy: 116 }));
    const audit = JSON.stringify(db.recordSecurityAuditEvent.mock.calls);
    expect(audit).toContain('"publicCoursePublished":false');
    expect(audit).toContain('"learnerProgressCreated":false');
    expect(audit).toContain('"credentialIssued":false');
  });

  it("records human-reviewed programme milestone progress without automatic completion or credential action", async () => {
    await appRouter.createCaller(context()).nsos.learningOperations.recordMilestoneProgress({ schoolId: 34, enrollmentId: 801, milestoneId: 561, status: "reviewed_complete", note: "Checked in workshop", confirmed: true });
    expect(db.recordProgramMilestoneProgress).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 34, enrollmentId: 801, milestoneId: 561, status: "reviewed_complete", updatedBy: 116 }));
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "learning_curriculum_milestone_progress_reviewed", metadata: expect.objectContaining({ automaticCompletion: false, credentialIssued: false, messageSent: false }) }));
  });

  it("uses confirmed routes for cohort, existing instructor, existing learner, and human completion without an account, invitation, payment, or credential action", async () => {
    const caller = appRouter.createCaller(context()).nsos.learningOperations;
    await caller.createCohort({ schoolId: 34, programId: 501, name: "May Intake", confirmed: true });
    await caller.assignInstructor({ schoolId: 34, programId: 501, staffId: 211, assignmentRole: "lead", confirmed: true });
    await caller.enrolLearner({ schoolId: 34, programId: 501, studentId: 311, enrolledOn: "2026-08-22", confirmed: true });
    await caller.confirmCompletion({ schoolId: 34, enrollmentId: 801, confirmed: true });
    expect(db.assignProgramInstructor).toHaveBeenCalledWith(expect.objectContaining({ staffId: 211, assignedBy: 116, confirmed: true }));
    expect(db.enrolLearnerInProgram).toHaveBeenCalledWith(expect.objectContaining({ studentId: 311, createdBy: 116, confirmed: true }));
    const audit = JSON.stringify(db.recordSecurityAuditEvent.mock.calls);
    expect(audit).toContain('"accountCreated":false');
    expect(audit).toContain('"invitationSent":false');
    expect(audit).toContain('"credentialIssued":false');
  });

  it("records programme attendance and prepares fee structures without creating an invoice or collecting a payment", async () => {
    const caller = appRouter.createCaller(context()).nsos.learningOperations;
    await caller.recordAttendance({ schoolId: 34, enrollmentId: 801, attendanceDate: "2026-08-22", status: "present", confirmed: true });
    await caller.createFeeStructure({ schoolId: 34, programId: 501, name: "Tuition", amount: 45000, mandatory: true, confirmed: true });
    await caller.activateFeeStructure({ schoolId: 34, feeStructureId: 901, confirmed: true });
    expect(db.recordProgramAttendance).toHaveBeenCalledWith(expect.objectContaining({ enrollmentId: 801, status: "present", recordedBy: 116 }));
    expect(db.createProgramFeeStructure).toHaveBeenCalledWith(expect.objectContaining({ programId: 501, amount: "45000.00", createdBy: 116 }));
    const audit = JSON.stringify(db.recordSecurityAuditEvent.mock.calls);
    expect(audit).toContain('"invoiceCreated":false');
    expect(audit).toContain('"paymentCollection":false');
  });

  it("denies non-management users and rate-limited requests before a programme operation", async () => {
    db.getSchoolMembership.mockResolvedValue({ schoolId: 34, userId: 116, role: "teacher", status: "active" });
    await expect(appRouter.createCaller(context()).nsos.learningOperations.workspace({ schoolId: 34 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    db.getSchoolMembership.mockResolvedValue({ schoolId: 34, userId: 116, role: "owner", status: "active" });
    db.consumeSharedRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 60 });
    await expect(appRouter.createCaller(context()).nsos.learningOperations.activateProgram({ schoolId: 34, programId: 501, confirmed: true })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(db.activateLearningProgram).not.toHaveBeenCalled();
  });
});
