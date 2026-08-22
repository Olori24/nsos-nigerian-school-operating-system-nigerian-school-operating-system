import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ getSchoolMembership: vi.fn(), consumeSharedRateLimit: vi.fn(), getLearningOperationsWorkspace: vi.fn(), getLearningOperatingType: vi.fn(), listLearningEvidenceSources: vi.fn(), createLearningEvidenceSource: vi.fn(), applyCourseStudioDraft: vi.fn(), updateLearningOperatingType: vi.fn(), createLearningProgram: vi.fn(), activateLearningProgram: vi.fn(), createProgramCurriculumModule: vi.fn(), activateProgramCurriculumModule: vi.fn(), createProgramCurriculumMilestone: vi.fn(), activateProgramCurriculumMilestone: vi.fn(), recordProgramMilestoneProgress: vi.fn(), createProgramCohort: vi.fn(), assignProgramInstructor: vi.fn(), enrolLearnerInProgram: vi.fn(), confirmProgramCompletion: vi.fn(), createProgramCertificationPolicy: vi.fn(), activateProgramCertificationPolicy: vi.fn(), issueProgramCertificate: vi.fn(), recordProgramAttendance: vi.fn(), createProgramFeeStructure: vi.fn(), activateProgramFeeStructure: vi.fn(), recordSecurityAuditEvent: vi.fn() }));
const courseStudio = vi.hoisted(() => ({ buildCourseStudioDraft: vi.fn() }));
vi.mock("./db", () => db);
vi.mock("./courseStudio", () => courseStudio);

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
    db.getLearningOperationsWorkspace.mockResolvedValue({ operatingType: "vocational_institute", programs: [], cohorts: [], assignments: [], enrolments: [], attendance: [], fees: [], modules: [], milestones: [], milestoneProgress: [], staff: [], learners: [], evidenceSources: [], experienceProfiles: [], certificationPolicies: [], certificates: [] });
    db.getLearningOperatingType.mockResolvedValue("vocational_institute");
    db.listLearningEvidenceSources.mockResolvedValue([]);
    courseStudio.buildCourseStudioDraft.mockResolvedValue({ courseTitle: "Digital Design Foundation", courseSummary: "An internal supervised course outline for controlled learning operations.", deliveryMode: "blended", durationLabel: "Six weeks", tutorBrief: "Configure a supervised tutor only after a human defines scope and escalation.", evidenceReferences: [], learningExperience: { learningPace: "guided", supportStyle: "balanced", practiceMode: "guided_practice", accessibilityNote: "" }, modules: [{ title: "Design basics", description: "Introduce approved concepts through supervised instruction.", learningType: "topic", milestones: [{ title: "Review key terms", description: "A human instructor reviews understanding using local criteria." }] }, { title: "Guided practice", description: "Use practice activities with instructor feedback.", learningType: "practice", milestones: [{ title: "Review practice", description: "A human instructor agrees the learner’s next step." }] }], materials: [{ title: "Facilitator guide", materialType: "facilitator_guide", modulePosition: 1, content: "Set the approved learning goal and direct learners to a supervising instructor for support." }, { title: "Practice prompt", materialType: "practice_activity", modulePosition: 2, content: "Use a short non-graded practice activity and request instructor feedback before any progress review." }], setupRecommendation: "Review the programme and activate it only through the protected workflow.", limitations: ["No public course or payment action is created."], source: "ai", requiresConfirmation: true });
    db.applyCourseStudioDraft.mockResolvedValue({ programId: 512, moduleCount: 2, milestoneCount: 2, materialCount: 2, status: "draft" });
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
    db.createLearningEvidenceSource.mockResolvedValue({ evidenceSourceId: 611, status: "active" });
    db.createProgramCertificationPolicy.mockResolvedValue({ certificationPolicyId: 711, status: "draft" });
    db.activateProgramCertificationPolicy.mockResolvedValue({ success: true, status: "active" });
    db.issueProgramCertificate.mockResolvedValue({ certificateId: 811, certificateReference: "NSOS-PRIVATE-6F4A", status: "issued", publicVerificationEnabled: false });
    db.recordProgramAttendance.mockResolvedValue({ success: true, enrollmentId: 801, attendanceDate: "2026-08-22", status: "present" });
    db.createProgramFeeStructure.mockResolvedValue({ feeStructureId: 901, status: "draft" });
    db.activateProgramFeeStructure.mockResolvedValue({ success: true, status: "active" });
  });

  it("returns only the active tenant workspace to an owner or administrator", async () => {
    await expect(appRouter.createCaller(context()).nsos.learningOperations.workspace({ schoolId: 34 })).resolves.toMatchObject({ operatingType: "vocational_institute" });
    expect(db.getLearningOperationsWorkspace).toHaveBeenCalledWith(34);
  });

  it("prepares a tenant-scoped Course Studio draft without persisting a course or retaining the owner prompt", async () => {
    const privateBrief = "Confidential internal creative-skills expansion plan";
    const draft = await appRouter.createCaller(context()).nsos.learningOperations.courseStudio({ schoolId: 34, brief: privateBrief, audience: "Adult beginner learners", deliveryMode: "blended", durationPreference: "Six weeks" });
    expect(draft).toMatchObject({ source: "ai", requiresConfirmation: true, courseTitle: "Digital Design Foundation" });
    expect(courseStudio.buildCourseStudioDraft).toHaveBeenCalledWith(expect.objectContaining({ operatingType: "vocational_institute", brief: privateBrief }));
    expect(db.applyCourseStudioDraft).not.toHaveBeenCalled();
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "course_studio_draft_prepared", metadata: expect.objectContaining({ promptStored: false, persisted: false, publicCoursePublished: false, enrollmentCreated: false, paymentAction: false }) }));
    expect(JSON.stringify(db.recordSecurityAuditEvent.mock.calls)).not.toContain(privateBrief);
  });

  it("applies a reviewed Course Studio draft only with explicit confirmation and records no public, identity, message, finance, completion, or credential side effect", async () => {
    const caller = appRouter.createCaller(context()).nsos.learningOperations;
    const prepared = await caller.courseStudio({ schoolId: 34, brief: "Create a supervised digital design foundation course.", audience: "Adult beginner learners" });
    await expect(caller.applyCourseStudioDraft({ schoolId: 34, draft: { courseTitle: prepared.courseTitle, courseSummary: prepared.courseSummary, deliveryMode: prepared.deliveryMode, durationLabel: prepared.durationLabel, evidenceReferences: prepared.evidenceReferences, learningExperience: prepared.learningExperience, modules: prepared.modules, materials: prepared.materials }, confirmed: true })).resolves.toMatchObject({ programId: 512, status: "draft" });
    expect(db.applyCourseStudioDraft).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 34, createdBy: 116, draft: expect.objectContaining({ courseTitle: "Digital Design Foundation" }) }));
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "course_studio_draft_applied", targetId: 512, metadata: expect.objectContaining({ confirmationRequired: true, publicCoursePublished: false, accountCreated: false, enrollmentCreated: false, messageSent: false, paymentAction: false, automaticCompletion: false, credentialIssued: false }) }));
  });

  it("resolves only recognised curated references for a Course Studio request and keeps the prompt out of the audit evidence", async () => {
    const privateBrief = "Private research-led outline for a digital learning programme";
    await appRouter.createCaller(context()).nsos.learningOperations.courseStudio({ schoolId: 34, brief: privateBrief, audience: "Adult learners", curatedSourceIds: ["nerdc_basic_education"], learningExperience: { learningPace: "flexible", supportStyle: "worked_examples", practiceMode: "project_based", accessibilityNote: "Mobile-friendly activities" } });
    expect(courseStudio.buildCourseStudioDraft).toHaveBeenCalledWith(expect.objectContaining({ evidenceReferences: [expect.objectContaining({ id: "curated:nerdc_basic_education", category: "official_curriculum" })], learningExperience: expect.objectContaining({ learningPace: "flexible", practiceMode: "project_based" }) }));
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "course_studio_draft_prepared", metadata: expect.objectContaining({ curatedSourceCount: 1, institutionSourceCount: 0, promptStored: false }) }));
    expect(JSON.stringify(db.recordSecurityAuditEvent.mock.calls)).not.toContain(privateBrief);
  });

  it("creates only confirmed institution planning-source metadata and separates private certification policy, activation, and issuance", async () => {
    const caller = appRouter.createCaller(context()).nsos.learningOperations;
    await caller.createEvidenceSource({ schoolId: 34, title: "Internal scheme reference", organisation: "NSOS partner institute", sourceUrl: "https://example.org/scheme", category: "institution_approved", allowedUse: "Use only as an editable internal reference for sequencing lessons and review checkpoints.", confirmed: true });
    await caller.createCertificationPolicy({ schoolId: 34, programId: 501, issuerName: "Example Learning Institute", credentialTitle: "Private programme completion record", completionCriteria: "The institution must human-confirm programme completion and review all active programme milestones before issuing a private record.", confirmed: true });
    await caller.activateCertificationPolicy({ schoolId: 34, certificationPolicyId: 711, confirmed: true });
    await caller.issuePrivateCertificate({ schoolId: 34, certificationPolicyId: 711, enrollmentId: 801, evidenceSummary: "A human reviewer confirmed completed enrolment and reviewed every active milestone as complete before the private record was requested.", confirmed: true });
    expect(db.createLearningEvidenceSource).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 34, createdBy: 116, approvedBy: 116, category: "institution_approved" }));
    expect(db.createProgramCertificationPolicy).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 34, programId: 501, createdBy: 116 }));
    expect(db.activateProgramCertificationPolicy).toHaveBeenCalledWith({ schoolId: 34, certificationPolicyId: 711, activatedBy: 116 });
    expect(db.issueProgramCertificate).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 34, certificationPolicyId: 711, enrollmentId: 801, issuedBy: 116 }));
    const audit = JSON.stringify(db.recordSecurityAuditEvent.mock.calls);
    expect(audit).toContain('"publicVerificationEnabled":false');
    expect(audit).toContain('"accreditationClaimed":false');
    expect(audit).toContain('"messageSent":false');
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
