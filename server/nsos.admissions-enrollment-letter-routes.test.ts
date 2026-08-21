import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, getSchoolMembership: vi.fn(), enrolApplication: vi.fn(), createMessageLog: vi.fn(), updateMessageLogDelivery: vi.fn(), recordSecurityAuditEvent: vi.fn() };
});

vi.mock("./auth", () => ({ sendAdmissionLetterEmail: vi.fn(), sendStaffSetupInvitationEmail: vi.fn() }));

import * as db from "./db";
import { sendAdmissionLetterEmail } from "./auth";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const owner = { id: 91, openId: "school-owner", name: "School Owner", email: "owner@example.com", loginMethod: "email", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const membership = { id: 1, schoolId: 7, userId: 91, role: "owner", status: "active", createdAt: new Date(), updatedAt: new Date() };
const enrollment = { studentId: 44, biodataTransferred: true, guardianLinked: true, guardianCreated: true, admissionLetter: { guardianEmail: "guardian@example.com", guardianName: "Mrs. Okafor", studentName: "Amina Chiamaka Okafor", schoolName: "Greener Future Academy", schoolAddress: "Abeokuta, Ogun State", admissionNo: "GFA/2026/014", className: "Primary 1", sessionName: "2026/2027 Session", admittedOn: "2026-09-01" } };
const input = { schoolId: 7, applicationId: 32, admissionNo: "GFA/2026/014", classId: 4, sessionId: 3, admittedOn: "2026-09-01" };
const caller = () => appRouter.createCaller({ user: owner, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("confirmed admission enrollment and letter delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getSchoolMembership).mockResolvedValue(membership as any);
    vi.mocked(db.enrolApplication).mockResolvedValue(enrollment as any);
    vi.mocked(db.createMessageLog).mockResolvedValue({ messageId: 501 });
    vi.mocked(sendAdmissionLetterEmail).mockResolvedValue("resend-admission-501");
  });

  it("transfers confirmed enrollment, sends the generated letter, and records a sent delivery audit", async () => {
    await expect(caller().nsos.admissions.enrol(input)).resolves.toMatchObject({ studentId: 44, biodataTransferred: true, guardianLinked: true, guardianCreated: true, letterDelivery: "sent" });
    expect(sendAdmissionLetterEmail).toHaveBeenCalledWith(expect.objectContaining({ email: "guardian@example.com", subject: expect.stringContaining("Amina Chiamaka Okafor"), html: expect.stringContaining("GFA/2026/014") }));
    expect(db.createMessageLog).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 7, channel: "email", audience: "guardians", recipientCount: 1, createdBy: 91 }));
    expect(db.updateMessageLogDelivery).toHaveBeenCalledWith({ schoolId: 7, messageId: 501, status: "sent", providerMessageId: "resend-admission-501" });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ biodataTransferred: true, guardianLinked: true, guardianCreated: true, admissionLetterDelivery: "sent" }) }));
  });

  it("keeps the completed learner record and logs a failed delivery when the email provider rejects the letter", async () => {
    vi.mocked(sendAdmissionLetterEmail).mockRejectedValue(new Error("provider offline"));
    await expect(caller().nsos.admissions.enrol(input)).resolves.toMatchObject({ studentId: 44, letterDelivery: "failed" });
    expect(db.updateMessageLogDelivery).toHaveBeenCalledWith({ schoolId: 7, messageId: 501, status: "failed" });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ admissionLetterDelivery: "failed" }) }));
  });

  it("does not attempt family email delivery when the approved admission has no guardian email", async () => {
    vi.mocked(db.enrolApplication).mockResolvedValue({ ...enrollment, admissionLetter: { ...enrollment.admissionLetter, guardianEmail: null } } as any);
    await expect(caller().nsos.admissions.enrol(input)).resolves.toMatchObject({ studentId: 44, letterDelivery: "not_sent_no_guardian_email" });
    expect(sendAdmissionLetterEmail).not.toHaveBeenCalled();
    expect(db.createMessageLog).not.toHaveBeenCalled();
  });

  it("reports reuse when the submitted guardian already has a record in the same tenant", async () => {
    vi.mocked(db.enrolApplication).mockResolvedValue({ ...enrollment, guardianCreated: false } as any);
    await expect(caller().nsos.admissions.enrol(input)).resolves.toMatchObject({ studentId: 44, guardianLinked: true, guardianCreated: false, letterDelivery: "sent" });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ guardianLinked: true, guardianCreated: false }) }));
  });

  it("keeps enrollment restricted to active roles with student-write permission", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ ...membership, role: "teacher" } as any);
    await expect(caller().nsos.admissions.enrol(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.enrolApplication).not.toHaveBeenCalled();
  });
});
