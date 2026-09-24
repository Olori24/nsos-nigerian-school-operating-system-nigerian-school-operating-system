import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ getSchoolMembership: vi.fn(), consumeSharedRateLimit: vi.fn(), getLearningOperatingType: vi.fn(), createInstitutionBlueprint: vi.fn(), listInstitutionBlueprints: vi.fn(), getInstitutionBlueprint: vi.fn(), updateInstitutionBlueprint: vi.fn(), applyInstitutionBlueprint: vi.fn(), saveInstitutionBlueprintWebsiteDraft: vi.fn(), recordSecurityAuditEvent: vi.fn() }));
const builder = vi.hoisted(() => ({ buildInstitutionBlueprint: vi.fn() }));

vi.mock("./db", async importOriginal => ({ ...(await importOriginal<typeof import("./db")>()), ...db }));
vi.mock("./institutionBuilder", () => builder);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const user = { id: 116, openId: "institution-owner", name: "Institution Owner", email: "owner@example.com", loginMethod: "email", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const membership = { id: 7, schoolId: 34, userId: 116, role: "owner", status: "active", createdAt: new Date(), updatedAt: new Date() };
const blueprint = {
  version: 1 as const,
  identity: { nameSuggestion: "Practical AI Studio", tagline: "Build practical capability.", description: "An editable private institution concept for practical AI and automation learning.", mission: "Support careful practical learning.", vision: "Improve learning delivery through accountable review.", targetLearners: "Adult beginners and entrepreneurs", positioning: "Practical project-based learning." },
  websiteDraft: { headline: "Learn by building.", introduction: "An editable unpublished website starting point for an owner-reviewed practical learning offer.", programmeCallout: "Explore the practical foundation.", faq: [{ question: "Who is this for?", answer: "The owner confirms eligibility before publication." }, { question: "How does it work?", answer: "The owner reviews delivery and support before activation." }] },
  learning: { primaryProgramTitle: "AI and automation foundation", primaryProgramSummary: "A reviewable internal foundation with practical activities and human-reviewed milestones.", learningPathLabel: "Online learning path", projectApproach: "Use practical non-graded project work with human instructor review." },
  admissionsReadiness: { recommendedSteps: ["Review admission requirements.", "Confirm public entry information."], ownerDecisions: ["Approved questions"] },
  pricingReadiness: { approach: "Review an approved delivery and value model before creating inactive finance drafts.", ownerDecisions: ["Free or paid model"] },
  lifecycleHandoffs: [{ label: "Learning", destination: "learning", detail: "Review the internal learning foundation." }, { label: "Website", destination: "website", detail: "Review public copy separately." }, { label: "Admissions", destination: "admissions", detail: "Configure admissions separately." }, { label: "Pricing", destination: "finance", detail: "Prepare inactive finance drafts separately." }],
  courseDraft: { courseTitle: "AI and automation foundation", courseSummary: "A reviewable internal foundation with practical activities and human-reviewed milestones.", deliveryMode: "self_paced", durationLabel: "Owner to review", tutorBrief: "Review tutor scope separately.", evidenceReferences: [], learningExperience: { learningPace: "guided", supportStyle: "balanced", practiceMode: "guided_practice", accessibilityNote: "" }, modules: [{ title: "Orientation", description: "Set an approved learning goal and delivery routine.", learningType: "topic", milestones: [{ title: "Review the goal", description: "A human reviewer checks the approved learning goal." }] }, { title: "Practice", description: "Complete supervised practical learning.", learningType: "practice", milestones: [{ title: "Hold review", description: "A human reviewer records the appropriate next step." }] }], materials: [{ title: "Facilitator guide", materialType: "facilitator_guide", modulePosition: 1, content: "Use approved learning goals and a human support boundary." }, { title: "Practice prompt", materialType: "practice_activity", modulePosition: 2, content: "Use non-graded practice with an accountable instructor." }], setupRecommendation: "Save as a private internal draft only.", limitations: ["No public action."], source: "guided", requiresConfirmation: true },
  limitations: ["No public or financial action."], source: "guided" as const, requiresConfirmation: true,
};
const record = { id: 501, schoolId: 34, createdBy: 116, status: "prepared", blueprint, idempotencyKey: "institution-builder-a6c7d9f2-001", appliedProgramId: null, appliedBy: null, appliedAt: null, createdAt: new Date(), updatedAt: new Date() };
const caller = () => appRouter.createCaller({ user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("NSOS institution builder routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.getSchoolMembership.mockResolvedValue(membership);
    db.consumeSharedRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    db.getLearningOperatingType.mockResolvedValue("online_training_provider");
    builder.buildInstitutionBlueprint.mockResolvedValue(blueprint);
    db.createInstitutionBlueprint.mockResolvedValue(record);
    db.listInstitutionBlueprints.mockResolvedValue([record]);
    db.getInstitutionBlueprint.mockResolvedValue(record);
    db.updateInstitutionBlueprint.mockResolvedValue(record);
    db.applyInstitutionBlueprint.mockResolvedValue({ blueprint: { ...record, status: "applied", appliedProgramId: 91 }, applied: true, program: { id: 91, moduleCount: 2, milestoneCount: 2, materialCount: 2 } });
    db.saveInstitutionBlueprintWebsiteDraft.mockResolvedValue({ blueprint: record, saved: true, headline: "Learn by building.", introduction: "An editable unpublished website starting point for an owner-reviewed practical learning offer.", published: false });
  });

  it("prepares a private, tenant-scoped blueprint without retaining the raw owner prompt in audit evidence or applying a programme", async () => {
    const privateIdea = "Create an online academy for practical AI and automation learning for adult beginners.";
    await expect(caller().nsos.institutionBuilder.create({ schoolId: 34, request: privateIdea, idempotencyKey: "institution-builder-a6c7d9f2-001" })).resolves.toMatchObject({ id: 501, status: "prepared" });
    expect(builder.buildInstitutionBlueprint).toHaveBeenCalledWith({ prompt: privateIdea, operatingType: "online_training_provider" });
    expect(db.createInstitutionBlueprint).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 34, createdBy: 116, idempotencyKey: "institution-builder-a6c7d9f2-001" }));
    expect(JSON.stringify(db.recordSecurityAuditEvent.mock.calls)).not.toContain(privateIdea);
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "institution_blueprint_prepared", metadata: expect.objectContaining({ promptStored: false, requiresConfirmation: true, publicAction: false, accountCreated: false, enrollmentCreated: false, admissionCreated: false, paymentAction: false, messageSent: false, credentialIssued: false }) }));
    expect(db.applyInstitutionBlueprint).not.toHaveBeenCalled();
  });

  it("allows a tenant owner/admin to inspect and explicitly edit a prepared blueprint while rejecting unconfirmed edits", async () => {
    await expect(caller().nsos.institutionBuilder.list({ schoolId: 34 })).resolves.toHaveLength(1);
    await expect(caller().nsos.institutionBuilder.detail({ schoolId: 34, blueprintId: 501 })).resolves.toMatchObject({ id: 501, schoolId: 34 });
    const edits = { nameSuggestion: "Practical AI Studio", tagline: "Build practical capability.", description: "An editable private institution concept for practical AI and automation learning.", targetLearners: "Adult beginners and entrepreneurs", positioning: "Practical project-based learning.", primaryProgramTitle: "AI and automation foundation", primaryProgramSummary: "A reviewable internal foundation with practical activities and human-reviewed milestones." };
    await expect(caller().nsos.institutionBuilder.update({ schoolId: 34, blueprintId: 501, edits, confirmed: true })).resolves.toMatchObject({ id: 501 });
    expect(db.updateInstitutionBlueprint).toHaveBeenCalledWith({ schoolId: 34, blueprintId: 501, edits });
    await expect(caller().nsos.institutionBuilder.update({ schoolId: 34, blueprintId: 501, edits, confirmed: false as any })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires one explicit approval before it applies only the internal learning foundation and records no external or high-impact side effect", async () => {
    await expect(caller().nsos.institutionBuilder.applyBlueprint({ schoolId: 34, blueprintId: 501, confirmed: true })).resolves.toMatchObject({ applied: true, program: { id: 91 } });
    expect(db.applyInstitutionBlueprint).toHaveBeenCalledWith({ schoolId: 34, blueprintId: 501, appliedBy: 116 });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "institution_blueprint_applied", metadata: expect.objectContaining({ confirmationRequired: true, programmeCreated: true, publicAction: false, accountCreated: false, enrollmentCreated: false, admissionCreated: false, paymentAction: false, messageSent: false, credentialIssued: false, progressChanged: false }) }));
    await expect(caller().nsos.institutionBuilder.applyBlueprint({ schoolId: 34, blueprintId: 501, confirmed: false as any })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("saves only a separately confirmed unpublished website draft and never publishes, changes a domain, or applies the learning foundation", async () => {
    await expect(caller().nsos.institutionBuilder.saveWebsiteDraft({ schoolId: 34, blueprintId: 501, confirmed: true })).resolves.toMatchObject({ saved: true, published: false });
    expect(db.saveInstitutionBlueprintWebsiteDraft).toHaveBeenCalledWith({ schoolId: 34, blueprintId: 501 });
    expect(db.applyInstitutionBlueprint).not.toHaveBeenCalled();
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "institution_blueprint_website_draft_saved", metadata: expect.objectContaining({ confirmationRequired: true, unpublishedDraftSaved: true, publicAction: false, published: false, domainChanged: false, admissionsChanged: false, paymentAction: false, messageSent: false, credentialIssued: false }) }));
    await expect(caller().nsos.institutionBuilder.saveWebsiteDraft({ schoolId: 34, blueprintId: 501, confirmed: false as any })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("blocks teachers and rate-limited calls before planner or persistence work", async () => {
    db.getSchoolMembership.mockResolvedValue({ ...membership, role: "teacher" });
    await expect(caller().nsos.institutionBuilder.create({ schoolId: 34, request: "Create an online academy for practical learning.", idempotencyKey: "institution-builder-a6c7d9f2-001" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(builder.buildInstitutionBlueprint).not.toHaveBeenCalled();
    db.getSchoolMembership.mockResolvedValue(membership);
    db.consumeSharedRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 53 });
    await expect(caller().nsos.institutionBuilder.create({ schoolId: 34, request: "Create an online academy for practical learning.", idempotencyKey: "institution-builder-a6c7d9f2-001" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(builder.buildInstitutionBlueprint).not.toHaveBeenCalled();
    expect(db.createInstitutionBlueprint).not.toHaveBeenCalled();
  });
});
