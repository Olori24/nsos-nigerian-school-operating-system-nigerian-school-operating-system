import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ getSchoolMembership: vi.fn(), consumeSharedRateLimit: vi.fn(), listInstitutionKnowledgeWorkspace: vi.fn(), createInstitutionKnowledgeSource: vi.fn(), createInstitutionKnowledgeAnalysis: vi.fn(), getInstitutionKnowledgeAnalysis: vi.fn(), getLearningOperatingType: vi.fn(), createInstitutionBlueprint: vi.fn(), deleteInstitutionKnowledgeSource: vi.fn(), recordSecurityAuditEvent: vi.fn() }));
const engine = vi.hoisted(() => ({ analyseKnowledgeForBusiness: vi.fn(), validateKnowledgeSourceText: vi.fn() }));
const builder = vi.hoisted(() => ({ buildInstitutionBlueprint: vi.fn() }));
vi.mock("./db", async importOriginal => ({ ...(await importOriginal<typeof import("./db")>()), ...db }));
vi.mock("./knowledgeBusinessEngine", () => engine);
vi.mock("./institutionBuilder", () => builder);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const user = { id: 119, openId: "knowledge-owner", name: "Knowledge Owner", email: "owner@example.com", loginMethod: "email", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const membership = { id: 7, schoolId: 34, userId: 119, role: "owner", status: "active", createdAt: new Date(), updatedAt: new Date() };
const caller = () => appRouter.createCaller({ user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
const analysis = { version: 1, source: "guided" as const, requiresConfirmation: true, summary: "Private source analysis.", expertiseAreas: ["Topic"], themes: ["Theme one", "Theme two"], coreConcepts: ["Concept one", "Concept two"], learningObjectives: [{ title: "Objective", outcome: "Outcome" }], prerequisiteQuestions: ["Question"], knowledgeGaps: ["Gap"], programmeIdeas: [{ title: "Programme", audience: "Audience", outcome: "Outcome" }], projectIdeas: [{ title: "Project", brief: "Private brief" }], offerReadiness: { positioning: "Private positioning", freeOfferDirection: "Private direction", coreOfferDirection: "Private core direction", ownerDecisions: ["Decision one", "Decision two"] }, websiteReadiness: { headlineDirection: "Private headline", proofBoundary: "No public proof claims", ownerDecisions: ["Decision"] }, qualityReview: { reviewQuestions: ["Question one", "Question two"], blockedAssumptions: ["No grade", "No payment"] }, builderPrompt: "Build a private review-first learning organisation from approved knowledge.", limitations: ["No public action", "No payment action"] };
const blueprint = { source: "guided", courseDraft: { modules: [{}, {}], materials: [{}, {}] } };

describe("Knowledge-to-Business protected routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.getSchoolMembership.mockResolvedValue(membership);
    db.consumeSharedRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    db.listInstitutionKnowledgeWorkspace.mockResolvedValue({ sources: [], analyses: [] });
    engine.validateKnowledgeSourceText.mockImplementation((value: string) => value);
    db.createInstitutionKnowledgeSource.mockResolvedValue({ id: 71, schoolId: 34, sourceType: "expertise_notes", title: "My notes", sourceText: "A sufficiently long approved knowledge source for private planning and a bounded learning foundation.", createdAt: new Date() });
    engine.analyseKnowledgeForBusiness.mockResolvedValue(analysis);
    db.createInstitutionKnowledgeAnalysis.mockResolvedValue({ id: 72, schoolId: 34, sourceId: 71, analysis });
    db.getInstitutionKnowledgeAnalysis.mockResolvedValue({ id: 72, schoolId: 34, sourceId: 71, analysis });
    db.getLearningOperatingType.mockResolvedValue("online_training_provider");
    builder.buildInstitutionBlueprint.mockResolvedValue(blueprint);
    db.createInstitutionBlueprint.mockResolvedValue({ id: 73, schoolId: 34 });
    db.deleteInstitutionKnowledgeSource.mockResolvedValue({ id: 71, deleted: true });
    db.recordSecurityAuditEvent.mockResolvedValue(undefined);
  });

  it("keeps the workspace owner/admin-only and tenant-scoped", async () => {
    await expect(caller().nsos.knowledgeBusiness.workspace({ schoolId: 34 })).resolves.toEqual({ sources: [], analyses: [] });
    expect(db.listInstitutionKnowledgeWorkspace).toHaveBeenCalledWith({ schoolId: 34 });
    db.getSchoolMembership.mockResolvedValue({ ...membership, role: "teacher" });
    await expect(caller().nsos.knowledgeBusiness.workspace({ schoolId: 34 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires confirmed analysis, audits no raw source text, and creates no action", async () => {
    const input = { schoolId: 34, sourceType: "expertise_notes" as const, title: "My notes", sourceText: "A sufficiently long approved knowledge source for private planning and a bounded learning foundation.", confirmed: true };
    await expect(caller().nsos.knowledgeBusiness.analyse(input)).resolves.toMatchObject({ source: { id: 71 }, analysis: { id: 72 } });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "institution_knowledge_analysed", metadata: expect.objectContaining({ sourceTextStoredInAudit: false, publicAction: false, paymentAction: false, messageSent: false, credentialIssued: false, learnerDecision: false }) }));
    expect(JSON.stringify(db.recordSecurityAuditEvent.mock.calls)).not.toContain(input.sourceText);
    await expect(caller().nsos.knowledgeBusiness.analyse({ ...input, confirmed: false as any })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    db.consumeSharedRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 32 });
    await expect(caller().nsos.knowledgeBusiness.analyse(input)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });

  it("prepares a separate confirmed Builder record without applying learning, public, financial, or learner actions", async () => {
    await expect(caller().nsos.knowledgeBusiness.prepareBuilder({ schoolId: 34, analysisId: 72, idempotencyKey: "knowledge-builder-key-1", confirmed: true })).resolves.toMatchObject({ id: 73 });
    expect(builder.buildInstitutionBlueprint).toHaveBeenCalledWith({ prompt: analysis.builderPrompt, operatingType: "online_training_provider" });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "institution_knowledge_builder_prepared", metadata: expect.objectContaining({ confirmationRequired: true, rawAnalysisStoredInAudit: false, publicAction: false, accountCreated: false, enrollmentCreated: false, paymentAction: false, messageSent: false, credentialIssued: false }) }));
  });

  it("allows an owner to delete a private source and its analyses only with confirmation", async () => {
    await expect(caller().nsos.knowledgeBusiness.deleteSource({ schoolId: 34, sourceId: 71, confirmed: true })).resolves.toEqual({ id: 71, deleted: true });
    expect(db.deleteInstitutionKnowledgeSource).toHaveBeenCalledWith({ schoolId: 34, sourceId: 71 });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "institution_knowledge_source_deleted", metadata: expect.objectContaining({ confirmationRequired: true, rawSourceStoredInAudit: false, analysesRemoved: true, publicAction: false }) }));
  });
});
