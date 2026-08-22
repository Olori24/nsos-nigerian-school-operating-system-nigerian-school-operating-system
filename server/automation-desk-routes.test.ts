import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, getSchoolMembership: vi.fn(), getTenantOnboardingStatus: vi.fn(), getLearningOperatingType: vi.fn(), consumeSharedRateLimit: vi.fn(), recordSecurityAuditEvent: vi.fn(), createAutomationJob: vi.fn(), listAutomationJobs: vi.fn(), getAutomationJobDetail: vi.fn(), saveAutomationJobInput: vi.fn(), approveAutomationJob: vi.fn(), claimAutomationJobExecution: vi.fn(), executeAutomationJob: vi.fn(), completeAutomationJob: vi.fn(), failAutomationJob: vi.fn() };
});
vi.mock("./automationDesk", () => ({ buildAutomationPlan: vi.fn(), jobCanRun: vi.fn(), validateAutomationInput: vi.fn() }));

import * as db from "./db";
import { buildAutomationPlan, jobCanRun, validateAutomationInput } from "./automationDesk";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const user = { id: 116, openId: "automation-owner", name: "Automation Owner", email: "owner@example.com", loginMethod: "email", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const membership = { id: 7, schoolId: 34, userId: 116, role: "owner", status: "active", createdAt: new Date(), updatedAt: new Date() };
const plan = { jobType: "academic_foundation" as const, title: "Apply an academic foundation", summary: "Create an approved planning session, term, real classes, and reviewed curriculum starter.", steps: ["Review approved academic details.", "Approve one controlled run."], missingFields: ["Session and term dates"], limitations: ["No learners, results, fees, messages, provider changes, or public actions are created."], source: "guided" as const };
const job = { id: 81, schoolId: 34, createdBy: 116, jobType: "academic_foundation", status: "ready_for_review", requestSummary: plan.title, plan, input: { sessionName: "2026/2027 Session" }, idempotencyKey: "automation-4bc437b4-5f2d-414c-ab1d-001", approvedBy: null, approvedAt: null, startedAt: null, completedAt: null, failureCode: null, createdAt: new Date(), updatedAt: new Date() };
const validInput = { sessionName: "2026/2027 Session", sessionStartsOn: "2026-09-01", sessionEndsOn: "2027-07-31", termName: "First Term", termStartsOn: "2026-09-01", termEndsOn: "2026-12-18", classes: [{ name: "Primary 1" }], templateId: "basic_primary" as const, includeOptional: false };
const launchPlan = { jobType: "online_school_launch" as const, title: "Create a private online-school foundation", summary: "Prepare a private internal learning foundation and configuration-readiness result.", steps: ["Review internal blueprint.", "Approve one private run."], missingFields: [], limitations: ["No people, public content, payments, messages, or credentials are created."], source: "guided" as const, launchDraft: { courseTitle: "Digital skills foundation", courseSummary: "A reviewable internal programme for organisation-approved intended learners.", deliveryMode: "self_paced" as const, durationLabel: "Owner to review", tutorBrief: "Review AI tutor scope separately with a supervising human.", modules: [{ title: "Orientation", description: "Set a safe learning goal and internal delivery routine.", learningType: "topic" as const, milestones: [{ title: "Review the learning goal", description: "A human reviewer checks the internal learning goal." }] }, { title: "Core practice", description: "Complete guided non-graded internal practice.", learningType: "practice" as const, milestones: [{ title: "Hold a learning review", description: "A human reviewer records the appropriate internal next step." }] }], materials: [{ title: "Facilitator guide", materialType: "facilitator_guide" as const, modulePosition: 1, content: "Use the approved learning goal and human escalation path for internal delivery." }, { title: "Practice prompt", materialType: "practice_activity" as const, modulePosition: 2, content: "Use non-graded practice with a supervising human reviewer." }], setupRecommendation: "Save as an internal draft only.", limitations: ["No public action.", "No people or finance action."], source: "guided" as const, requiresConfirmation: true } };
function caller() { return appRouter.createCaller({ user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] }); }

describe("NSOS Automation Desk routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getSchoolMembership).mockResolvedValue(membership as any);
    vi.mocked(db.getTenantOnboardingStatus).mockResolvedValue({ completionPercent: 0, completedSteps: 0, totalSteps: 6, steps: [{ id: "school-profile", label: "School profile", description: "", completed: true }, { id: "academic-foundation", label: "Academic foundation", description: "", completed: false, destination: "academics" }, { id: "team", label: "Team", description: "", completed: false, destination: "staff" }, { id: "learners", label: "Learners", description: "", completed: false, destination: "students" }, { id: "fees", label: "Fees", description: "", completed: false, destination: "finance" }, { id: "public-presence", label: "Website", description: "", completed: false, destination: "website" }] } as any);
    vi.mocked(db.getLearningOperatingType).mockResolvedValue("online_training_provider");
    vi.mocked(db.consumeSharedRateLimit).mockResolvedValue({ allowed: true, retryAfterSeconds: 0 } as any);
    vi.mocked(db.recordSecurityAuditEvent).mockResolvedValue(undefined as any);
    vi.mocked(buildAutomationPlan).mockResolvedValue(plan);
    vi.mocked(jobCanRun).mockReturnValue(true);
    vi.mocked(validateAutomationInput).mockReturnValue(validInput);
    vi.mocked(db.createAutomationJob).mockResolvedValue({ ...job, status: "needs_input" } as any);
    vi.mocked(db.getAutomationJobDetail).mockResolvedValue({ job, events: [] } as any);
    vi.mocked(db.saveAutomationJobInput).mockResolvedValue(job as any);
    vi.mocked(db.approveAutomationJob).mockResolvedValue({ ...job, status: "approved" } as any);
    vi.mocked(db.claimAutomationJobExecution).mockResolvedValue({ ...job, status: "running" } as any);
    vi.mocked(db.executeAutomationJob).mockResolvedValue({ label: "Academic foundation completed: 1 class created and curriculum linked.", destination: "academics", references: [{ type: "academic_session", id: 10 }, { type: "academic_term", id: 11 }, { type: "class", id: 12 }] } as any);
    vi.mocked(db.completeAutomationJob).mockResolvedValue({ ...job, status: "completed" } as any);
    vi.mocked(db.failAutomationJob).mockResolvedValue({ ...job, status: "failed", failureCode: "execution_failed" } as any);
  });

  it("creates a reviewed job from a plain-language goal without executing it or retaining the raw request in audit metadata", async () => {
    const privateGoal = "Confidential term preparation sequence for our internal strategy";
    await expect(caller().nsos.automationDesk.create({ schoolId: 34, request: privateGoal, idempotencyKey: "automation-4bc437b4-5f2d-414c-ab1d-001" })).resolves.toMatchObject({ id: 81, status: "needs_input" });
    expect(buildAutomationPlan).toHaveBeenCalledWith(expect.objectContaining({ request: privateGoal, operatingType: "online_training_provider" }));
    expect(db.createAutomationJob).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 34, createdBy: 116, requestSummary: plan.title, jobType: "academic_foundation" }));
    expect(db.executeAutomationJob).not.toHaveBeenCalled();
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "automation_job_prepared", metadata: expect.objectContaining({ promptStored: false, requiresConfirmation: true, publicAction: false, paymentAction: false }) }));
    expect(JSON.stringify(vi.mocked(db.recordSecurityAuditEvent).mock.calls)).not.toContain(privateGoal);
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ ...membership, role: "teacher" } as any);
    await expect(caller().nsos.automationDesk.create({ schoolId: 34, request: "Prepare academic setup", idempotencyKey: "automation-4bc437b4-5f2d-414c-ab1d-001" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires confirmed validated input before a single bounded run and records only safe completed outcome evidence", async () => {
    await expect(caller().nsos.automationDesk.saveInput({ schoolId: 34, jobId: 81, input: validInput, confirmed: true })).resolves.toMatchObject({ id: 81 });
    expect(validateAutomationInput).toHaveBeenCalledWith("academic_foundation", validInput);
    await expect(caller().nsos.automationDesk.approveAndRun({ schoolId: 34, jobId: 81, confirmed: true })).resolves.toMatchObject({ id: 81, status: "completed" });
    expect(db.approveAutomationJob).toHaveBeenCalledWith({ schoolId: 34, userId: 116, jobId: 81 });
    expect(db.claimAutomationJobExecution).toHaveBeenCalledWith({ schoolId: 34, userId: 116, jobId: 81 });
    expect(db.executeAutomationJob).toHaveBeenCalledWith({ schoolId: 34, userId: 116, jobId: 81 });
    expect(db.completeAutomationJob).toHaveBeenCalledWith(expect.objectContaining({ result: expect.objectContaining({ destination: "academics", references: expect.any(Array) }) }));
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "automation_job_completed", metadata: expect.objectContaining({ invitationSent: false, feeActivated: false, paymentAction: false, providerChanged: false, credentialIssued: false }) }));
    await expect(caller().nsos.automationDesk.approveAndRun({ schoolId: 34, jobId: 81, confirmed: false as any })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("refuses unsupported job types and converts execution failures into an explicit no-retry recovery state", async () => {
    vi.mocked(db.getAutomationJobDetail).mockResolvedValue({ job: { ...job, jobType: "course_draft" }, events: [] } as any);
    vi.mocked(jobCanRun).mockReturnValue(false);
    await expect(caller().nsos.automationDesk.approveAndRun({ schoolId: 34, jobId: 81, confirmed: true })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.executeAutomationJob).not.toHaveBeenCalled();

    vi.mocked(db.getAutomationJobDetail).mockResolvedValue({ job, events: [] } as any);
    vi.mocked(jobCanRun).mockReturnValue(true);
    vi.mocked(db.executeAutomationJob).mockRejectedValue(new Error("A safe executor stopped."));
    await expect(caller().nsos.automationDesk.approveAndRun({ schoolId: 34, jobId: 81, confirmed: true })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR", message: expect.stringContaining("Review the target workspace") });
    expect(db.failAutomationJob).toHaveBeenCalledWith({ schoolId: 34, userId: 116, jobId: 81, failureCode: "execution_failed" });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "automation_job_failed", metadata: expect.objectContaining({ automaticRetry: false, outcomeConfirmed: false }) }));
  });

  it("prepares and executes the selected private single-prompt launch without mock people or external/public side effects", async () => {
    const onlineGoal = "Set up a self-paced online digital skills academy with learning materials and a supervised tutor brief.";
    const onlineJob = { ...job, id: 82, jobType: "online_school_launch", status: "ready_for_review", plan: launchPlan, input: { draft: { courseTitle: launchPlan.launchDraft.courseTitle, courseSummary: launchPlan.launchDraft.courseSummary, deliveryMode: launchPlan.launchDraft.deliveryMode, durationLabel: launchPlan.launchDraft.durationLabel, modules: launchPlan.launchDraft.modules, materials: launchPlan.launchDraft.materials }, validationMode: "private_configuration_only" } };
    vi.mocked(buildAutomationPlan).mockResolvedValue(launchPlan as any);
    vi.mocked(db.createAutomationJob).mockResolvedValue(onlineJob as any);
    await expect(caller().nsos.automationDesk.create({ schoolId: 34, request: onlineGoal, idempotencyKey: "automation-launch-4bc437b4-5f2d-414c-ab1d-001" })).resolves.toMatchObject({ id: 82, status: "ready_for_review" });
    expect(db.createAutomationJob).toHaveBeenCalledWith(expect.objectContaining({ jobType: "online_school_launch", input: expect.objectContaining({ validationMode: "private_configuration_only", draft: expect.objectContaining({ courseTitle: "Digital skills foundation" }) }) }));
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "automation_job_prepared", metadata: expect.objectContaining({ privateLaunch: true, configurationValidationOnly: true, promptStored: false, publicAction: false, accountCreated: false, messageSent: false, paymentAction: false, credentialIssued: false }) }));
    expect(JSON.stringify(vi.mocked(db.recordSecurityAuditEvent).mock.calls)).not.toContain(onlineGoal);

    vi.mocked(db.getAutomationJobDetail).mockResolvedValue({ job: onlineJob, events: [] } as any);
    vi.mocked(db.executeAutomationJob).mockResolvedValue({ label: "Private online-school foundation completed: configuration-readiness check passed.", destination: "learning", references: [{ type: "learning_program_draft", id: 51 }] } as any);
    vi.mocked(db.completeAutomationJob).mockResolvedValue({ ...onlineJob, status: "completed" } as any);
    await expect(caller().nsos.automationDesk.approveAndRun({ schoolId: 34, jobId: 82, confirmed: true })).resolves.toMatchObject({ id: 82, status: "completed" });
    expect(db.saveAutomationJobInput).not.toHaveBeenCalled();
    expect(db.completeAutomationJob).toHaveBeenCalledWith(expect.objectContaining({ result: expect.objectContaining({ destination: "learning" }) }));
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "automation_job_completed", metadata: expect.objectContaining({ publicAction: false, accountCreated: false, invitationSent: false, feeActivated: false, paymentAction: false, providerChanged: false, credentialIssued: false }) }));
  });
});
