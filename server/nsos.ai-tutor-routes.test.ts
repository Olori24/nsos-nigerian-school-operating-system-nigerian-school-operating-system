import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getSchoolMembership: vi.fn(),
  getAiTutorWorkspace: vi.fn(),
  createAiTutor: vi.fn(),
  setAiTutorStatus: vi.fn(),
  listStudentAiTutors: vi.fn(),
  askAiTutor: vi.fn(),
  requestAiTutorEscalation: vi.fn(),
  submitAiTutorFeedback: vi.fn(),
  setAiTutorTeachingPreference: vi.fn(),
  getTeacherAiTutorAnalytics: vi.fn(),
  consumeSharedRateLimit: vi.fn(),
  recordSecurityAuditEvent: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function caller() {
  return appRouter.createCaller({ user: { id: 27, openId: "ai-tutor-user", name: "Tutor User", email: "tutor@example.com", loginMethod: "email", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

const membership = (role: "owner" | "admin" | "teacher" | "student") => ({ id: 1, schoolId: 4, userId: 27, role, status: "active", createdAt: new Date(), updatedAt: new Date() });

describe("NSOS supervised AI tutor routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getSchoolMembership).mockResolvedValue(membership("admin") as any);
    vi.mocked(db.consumeSharedRateLimit).mockResolvedValue({ allowed: true, retryAfterSeconds: 1 });
    vi.mocked(db.recordSecurityAuditEvent).mockResolvedValue(undefined);
  });

  it("restricts tutor configuration to school management roles", async () => {
    vi.mocked(db.getAiTutorWorkspace).mockResolvedValue({ tutors: [], subjects: [], supervisors: [] } as any);
    await expect(caller().nsos.aiTutors.workspace({ schoolId: 4 })).resolves.toMatchObject({ tutors: [] });
    vi.mocked(db.getSchoolMembership).mockResolvedValue(membership("teacher") as any);
    await expect(caller().nsos.aiTutors.workspace({ schoolId: 4 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates a draft tutor with an accountable supervisor and records a configuration audit event", async () => {
    vi.mocked(db.createAiTutor).mockResolvedValue({ tutorId: 12, status: "draft" });
    await expect(caller().nsos.aiTutors.create({ schoolId: 4, subjectId: 7, name: "Mathematics study guide", curriculumScope: "Explain approved algebra practice for JSS 2 and refer graded work to the teacher.", allowedLevels: ["JSS 2"], supervisorUserId: 31, dailyQuestionLimit: 15 })).resolves.toMatchObject({ tutorId: 12, status: "draft" });
    expect(db.createAiTutor).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 4, createdBy: 27, supervisorUserId: 31 }));
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "ai_tutor_created" }));
  });

  it("allows only linked student roles to access a tutor and keeps the learner question out of audit metadata", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue(membership("student") as any);
    vi.mocked(db.askAiTutor).mockResolvedValue({ answer: "Review your variables first.", studySteps: ["Read the question"], needsTeacherSupport: false, escalationReason: "", tutorName: "Mathematics study guide", conversationStored: false });
    await expect(caller().nsos.aiTutors.ask({ schoolId: 4, tutorId: 12, question: "Please explain this algebra expression." })).resolves.toMatchObject({ conversationStored: false });
    expect(db.consumeSharedRateLimit).toHaveBeenCalledWith(expect.objectContaining({ namespace: "ai-tutor", route: "study-question", clientKey: "4:27" }));
    expect(db.askAiTutor).toHaveBeenCalledWith({ schoolId: 4, tutorId: 12, question: "Please explain this algebra expression.", userId: 27 });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "ai_tutor_study_response", metadata: expect.not.objectContaining({ question: expect.anything() }) }));
  });

  it("denies a teacher access to the student-only tutor endpoint", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue(membership("teacher") as any);
    await expect(caller().nsos.aiTutors.studentHub({ schoolId: 4 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.listStudentAiTutors).not.toHaveBeenCalled();
  });

  it("accepts one student feedback rating through the response reference without writing the optional comment to audit metadata", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue(membership("student") as any);
    vi.mocked(db.submitAiTutorFeedback).mockResolvedValue({ submitted: true, conversationStored: false });
    const interactionKey = "c7b2a927-5a64-4a21-a021-e9944544e2b1";
    await expect(caller().nsos.aiTutors.submitFeedback({ schoolId: 4, interactionKey, helpfulness: "helpful", comment: "The steps were clear." })).resolves.toMatchObject({ submitted: true, conversationStored: false });
    expect(db.consumeSharedRateLimit).toHaveBeenCalledWith(expect.objectContaining({ namespace: "ai-tutor", route: "response-feedback", clientKey: "4:27" }));
    expect(db.submitAiTutorFeedback).toHaveBeenCalledWith({ schoolId: 4, interactionKey, helpfulness: "helpful", comment: "The steps were clear.", userId: 27 });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "ai_tutor_feedback_submitted", metadata: expect.objectContaining({ helpfulness: "helpful", commentStored: true, conversationStored: false }) }));
    const auditCall = vi.mocked(db.recordSecurityAuditEvent).mock.calls.at(-1)?.[0] as any;
    expect(auditCall.metadata).not.toHaveProperty("comment");
  });

  it("lets only a linked student enable or disable feedback-informed teaching format", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue(membership("student") as any);
    vi.mocked(db.setAiTutorTeachingPreference).mockResolvedValue({ adaptationEnabled: false, teachingStyle: "balanced" });
    await expect(caller().nsos.aiTutors.setTeachingPreference({ schoolId: 4, tutorId: 12, adaptationEnabled: false })).resolves.toMatchObject({ adaptationEnabled: false, teachingStyle: "balanced" });
    expect(db.setAiTutorTeachingPreference).toHaveBeenCalledWith({ schoolId: 4, tutorId: 12, adaptationEnabled: false, userId: 27 });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "ai_tutor_teaching_preference_changed", metadata: expect.objectContaining({ feedbackCommentsUsed: false }) }));
    vi.mocked(db.getSchoolMembership).mockResolvedValue(membership("teacher") as any);
    await expect(caller().nsos.aiTutors.setTeachingPreference({ schoolId: 4, tutorId: 12, adaptationEnabled: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows tutor adaptation analytics only to a teacher account", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue(membership("teacher") as any);
    vi.mocked(db.getTeacherAiTutorAnalytics).mockResolvedValue({ linkedTeacher: true, assignments: [], summary: {}, tutorClasses: [], learners: [] } as any);
    await expect(caller().nsos.aiTutors.teacherAnalytics({ schoolId: 4 })).resolves.toMatchObject({ linkedTeacher: true });
    expect(db.getTeacherAiTutorAnalytics).toHaveBeenCalledWith(4, 27);
    vi.mocked(db.getSchoolMembership).mockResolvedValue(membership("admin") as any);
    await expect(caller().nsos.aiTutors.teacherAnalytics({ schoolId: 4 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
