import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, getSchoolMembership: vi.fn(), listStudentGuardians: vi.fn(), updateStudentGuardian: vi.fn(), recordSecurityAuditEvent: vi.fn() };
});

vi.mock("./auth", () => ({ sendAdmissionLetterEmail: vi.fn(), sendGuardianPortalInvitationEmail: vi.fn(), sendStaffSetupInvitationEmail: vi.fn() }));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const user = { id: 44, openId: "school-admin", name: "School Administrator", email: "admin@example.com", loginMethod: "email", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const membership = { id: 1, schoolId: 7, userId: 44, role: "admin", status: "active", createdAt: new Date(), updatedAt: new Date() };
const caller = () => appRouter.createCaller({ user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("student guardian review and editing routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getSchoolMembership).mockResolvedValue(membership as any);
  });

  it("lets an active administrator review only a selected student's tenant-scoped guardians", async () => {
    vi.mocked(db.listStudentGuardians).mockResolvedValue([{ id: 9, firstName: "Amina", lastName: "Okafor", relationship: "Mother", isPrimaryForStudent: true }] as any);
    await expect(caller().nsos.students.guardians({ schoolId: 7, studentId: 21 })).resolves.toHaveLength(1);
    expect(db.listStudentGuardians).toHaveBeenCalledWith({ schoolId: 7, studentId: 21 });
  });

  it("updates only the linked guardian details and writes a non-sensitive audit outcome", async () => {
    vi.mocked(db.updateStudentGuardian).mockResolvedValue({ guardianId: 9, updated: true });
    await expect(caller().nsos.students.updateGuardian({ schoolId: 7, studentId: 21, guardianId: 9, firstName: "Amina", lastName: "Okafor", relationship: "Mother", email: "amina@example.com", phone: "08030000000", address: "Abeokuta", occupation: "Teacher", isPrimary: true })).resolves.toEqual({ guardianId: 9, updated: true });
    expect(db.updateStudentGuardian).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 7, studentId: 21, guardianId: 9, email: "amina@example.com", isPrimary: true }));
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "student_guardian_updated", metadata: { studentId: 21, guardianUpdated: true, primaryContact: true } }));
  });

  it("denies guardian review and editing to roles outside the owner-admin boundary", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ ...membership, role: "teacher" } as any);
    await expect(caller().nsos.students.guardians({ schoolId: 7, studentId: 21 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().nsos.students.updateGuardian({ schoolId: 7, studentId: 21, guardianId: 9, firstName: "Amina", lastName: "Okafor", relationship: "Mother", isPrimary: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.updateStudentGuardian).not.toHaveBeenCalled();
  });
});
