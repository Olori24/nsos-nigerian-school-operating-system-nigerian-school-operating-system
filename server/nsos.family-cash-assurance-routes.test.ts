import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getSchoolMembership: vi.fn(),
  getFamilyCashAssuranceData: vi.fn(),
  listFamilyPaymentEvidenceNotifications: vi.fn(),
  markFamilyPaymentEvidenceNotificationRead: vi.fn(),
  submitFamilyPaymentEvidence: vi.fn(),
  scanFamilyPaymentEvidence: vi.fn(),
  recordSecurityAuditEvent: vi.fn(),
  recordPayment: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const callerFor = (id: number) => appRouter.createCaller({
  user: { id, openId: `family-user-${id}`, name: "Portal User", email: "portal@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("Family Cash Assurance portal routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only family-scoped Cash Assurance data for a linked parent", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 1, schoolId: 8, userId: 41, role: "parent", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(db.getFamilyCashAssuranceData).mockResolvedValue({ cases: [{ id: 19, student: { id: 77 } }], promises: [], paymentEvidence: [] } as any);

    await expect(callerFor(41).nsos.portal.cashAssurance({ schoolId: 8 })).resolves.toMatchObject({ cases: [{ id: 19 }] });
    expect(db.getFamilyCashAssuranceData).toHaveBeenCalledWith({ schoolId: 8, userId: 41, role: "parent" });
  });

  it("allows a linked student to submit an attachment-backed evidence claim without posting a payment", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 2, schoolId: 8, userId: 42, role: "student", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(db.submitFamilyPaymentEvidence).mockResolvedValue({ evidenceId: 71 });

    await expect(callerFor(42).nsos.portal.submitPaymentEvidence({ schoolId: 8, caseId: 19, invoiceId: 66, amountClaimed: 12000, source: "bank_reference", providerReference: "TRX-9921", upload: { base64: "aGVsbG8=", fileName: "transfer-proof.pdf", mimeType: "application/pdf" } })).resolves.toEqual({ evidenceId: 71 });

    expect(db.submitFamilyPaymentEvidence).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 8, userId: 42, role: "student", caseId: 19, invoiceId: 66, amountClaimed: 12000, upload: expect.objectContaining({ fileName: "transfer-proof.pdf" }) }));
    expect(db.recordPayment).not.toHaveBeenCalled();
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 8, actorUserId: 42, eventType: "family_payment_evidence_submitted", targetId: 71, metadata: { source: "bank_reference", attachmentIncluded: true, ledgerChanged: false } }));
  });

  it("returns a confirmation-only AI receipt suggestion without posting a payment", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 4, schoolId: 8, userId: 42, role: "student", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(db.scanFamilyPaymentEvidence).mockResolvedValue({ amountNgn: 12000, paidOn: "2026-08-18", confidence: "medium", requiresConfirmation: true });

    await expect(callerFor(42).nsos.portal.scanPaymentEvidence({ schoolId: 8, caseId: 19, invoiceId: 66, upload: { base64: "aGVsbG8=", fileName: "transfer-proof.png", mimeType: "image/png" } })).resolves.toEqual({ amountNgn: 12000, paidOn: "2026-08-18", confidence: "medium", requiresConfirmation: true });

    expect(db.scanFamilyPaymentEvidence).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 8, userId: 42, role: "student", caseId: 19, invoiceId: 66 }));
    expect(db.recordPayment).not.toHaveBeenCalled();
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "family_payment_receipt_scanned", targetId: 19, metadata: { fileType: "image/png", requiresConfirmation: true, ledgerChanged: false } }));
  });

  it("shows and acknowledges only the signed-in family member's decision notifications", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 5, schoolId: 8, userId: 41, role: "parent", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(db.listFamilyPaymentEvidenceNotifications).mockResolvedValue([{ id: 90, evidenceId: 71, decision: "accepted", amountClaimed: 12000, readAt: null }] as any);
    vi.mocked(db.markFamilyPaymentEvidenceNotificationRead).mockResolvedValue({ success: true, evidenceId: 71 });

    await expect(callerFor(41).nsos.portal.paymentEvidenceNotifications({ schoolId: 8 })).resolves.toMatchObject([{ id: 90, decision: "accepted" }]);
    expect(db.listFamilyPaymentEvidenceNotifications).toHaveBeenCalledWith({ schoolId: 8, userId: 41, role: "parent" });

    await expect(callerFor(41).nsos.portal.markPaymentEvidenceNotificationRead({ schoolId: 8, notificationId: 90 })).resolves.toEqual({ success: true, evidenceId: 71 });
    expect(db.markFamilyPaymentEvidenceNotificationRead).toHaveBeenCalledWith({ schoolId: 8, userId: 41, role: "parent", notificationId: 90 });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "family_payment_evidence_notification_read", targetId: 71, metadata: { notificationAcknowledged: true } }));
  });

  it("rejects finance and staff roles from family portal evidence controls", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 3, schoolId: 8, userId: 43, role: "finance", status: "active", createdAt: new Date(), updatedAt: new Date() });

    await expect(callerFor(43).nsos.portal.cashAssurance({ schoolId: 8 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(callerFor(43).nsos.portal.paymentEvidenceNotifications({ schoolId: 8 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getFamilyCashAssuranceData).not.toHaveBeenCalled();
    expect(db.listFamilyPaymentEvidenceNotifications).not.toHaveBeenCalled();
  });
});
