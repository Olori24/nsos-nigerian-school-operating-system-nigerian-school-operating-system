import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, getSchoolMembership: vi.fn(), consumeSharedRateLimit: vi.fn(), createGuardianPortalInvitationForDelivery: vi.fn(), markGuardianPortalInvitationDelivery: vi.fn(), recordSecurityAuditEvent: vi.fn() };
});

vi.mock("./auth", () => ({ sendAdmissionLetterEmail: vi.fn(), sendGuardianPortalInvitationEmail: vi.fn(), sendStaffSetupInvitationEmail: vi.fn() }));

import * as db from "./db";
import { sendGuardianPortalInvitationEmail } from "./auth";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const user = { id: 81, openId: "school-owner", name: "School Owner", email: "owner@example.com", loginMethod: "email", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const membership = { id: 1, schoolId: 7, userId: 81, role: "owner", status: "active", createdAt: new Date(), updatedAt: new Date() };
const input = { schoolId: 7, studentId: 22, guardianId: 11, origin: "https://nsos.example", confirmed: true as const };
const caller = () => appRouter.createCaller({ user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("guardian portal invitation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getSchoolMembership).mockResolvedValue(membership as any);
    vi.mocked(db.consumeSharedRateLimit).mockResolvedValue({ allowed: true, retryAfterSeconds: 0 } as any);
    vi.mocked(db.createGuardianPortalInvitationForDelivery).mockResolvedValue({ invitationId: 71, email: "guardian@example.com", guardianName: "Amina Okafor", schoolName: "Greener Future Academy" });
    vi.mocked(db.markGuardianPortalInvitationDelivery).mockResolvedValue({ invitationId: 71, status: "sent" });
    vi.mocked(sendGuardianPortalInvitationEmail).mockResolvedValue(undefined);
  });

  it("requires explicit confirmation before creating or emailing a guardian portal invitation", async () => {
    await expect(caller().nsos.students.sendGuardianPortalInvitation({ ...input, confirmed: false as any })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.createGuardianPortalInvitationForDelivery).not.toHaveBeenCalled();
    expect(sendGuardianPortalInvitationEmail).not.toHaveBeenCalled();
  });

  it("sends only to the linked guardian email, records delivery, and audits the confirmed action", async () => {
    await expect(caller().nsos.students.sendGuardianPortalInvitation(input)).resolves.toEqual({ invitationId: 71, status: "sent" });
    expect(db.createGuardianPortalInvitationForDelivery).toHaveBeenCalledWith({ schoolId: 7, studentId: 22, guardianId: 11, sentBy: 81 });
    expect(sendGuardianPortalInvitationEmail).toHaveBeenCalledWith({ email: "guardian@example.com", guardianName: "Amina Okafor", schoolName: "Greener Future Academy", origin: "https://nsos.example" });
    expect(db.markGuardianPortalInvitationDelivery).toHaveBeenCalledWith({ schoolId: 7, invitationId: 71, status: "sent" });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "guardian_portal_invitation_sent", targetType: "guardian", targetId: 11, metadata: { invitationSent: true, confirmationRequired: true } }));
  });

  it("records a failed delivery without claiming successful access when email delivery fails", async () => {
    vi.mocked(sendGuardianPortalInvitationEmail).mockRejectedValue(new Error("provider unavailable"));
    await expect(caller().nsos.students.sendGuardianPortalInvitation(input)).rejects.toThrow("provider unavailable");
    expect(db.markGuardianPortalInvitationDelivery).toHaveBeenCalledWith({ schoolId: 7, invitationId: 71, status: "failed" });
    expect(db.recordSecurityAuditEvent).not.toHaveBeenCalled();
  });

  it("denies invitation delivery to non-owner, non-administrator roles", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ ...membership, role: "teacher" } as any);
    await expect(caller().nsos.students.sendGuardianPortalInvitation(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(sendGuardianPortalInvitationEmail).not.toHaveBeenCalled();
  });
});
