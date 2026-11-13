import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getSchoolMembership: vi.fn(),
  listCashAssuranceData: vi.fn(),
  listCashAssuranceReminderPolicies: vi.fn(),
  listCashAssuranceReminderRuns: vi.fn(),
  saveCashAssuranceReminderPolicy: vi.fn(),
  archiveCashAssuranceReminderPolicy: vi.fn(),
  proposeCashAssuranceReminder: vi.fn(),
  approveCashAssuranceReminder: vi.fn(),
  cancelCashAssuranceReminder: vi.fn(),
  openCashAssuranceCase: vi.fn(),
  recordCashAssurancePromise: vi.fn(),
  submitPaymentEvidence: vi.fn(),
  reviewPaymentEvidence: vi.fn(),
  recordCashAssuranceDispute: vi.fn(),
  resolveCashAssuranceDispute: vi.fn(),
  recordSecurityAuditEvent: vi.fn(),
  recordPayment: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const callerFor = (id: number) => appRouter.createCaller({
  user: { id, openId: `cash-user-${id}`, name: "Finance User", email: "finance@example.com", loginMethod: "google", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("Cash Assurance Phase 1 routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 1, schoolId: 4, userId: 12, role: "finance", status: "active", createdAt: new Date(), updatedAt: new Date() });
  });

  it("allows finance to read only a tenant-scoped Cash Assurance workbench", async () => {
    vi.mocked(db.listCashAssuranceData).mockResolvedValue({ dashboard: { outstanding: 0 }, cases: [], paymentEvidence: [], promises: [], events: [] } as any);

    await expect(callerFor(12).nsos.cashAssurance.list({ schoolId: 4 })).resolves.toMatchObject({ dashboard: { outstanding: 0 } });
    expect(db.listCashAssuranceData).toHaveBeenCalledWith(4);
  });

  it("opens an auditable collection case without invoking payment posting", async () => {
    vi.mocked(db.openCashAssuranceCase).mockResolvedValue({ caseId: 81 });

    await expect(callerFor(12).nsos.cashAssurance.openCase({ schoolId: 4, studentId: 22, invoiceId: 43, priority: "high" })).resolves.toEqual({ caseId: 81 });

    expect(db.openCashAssuranceCase).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 4, studentId: 22, invoiceId: 43, priority: "high", openedBy: 12 }));
    expect(db.recordPayment).not.toHaveBeenCalled();
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 4, actorUserId: 12, eventType: "cash_assurance_case_opened", targetId: 81, metadata: { priority: "high", invoiceLinked: true } }));
  });

  it("reviews payment evidence with an explicit no-ledger-change audit marker", async () => {
    vi.mocked(db.reviewPaymentEvidence).mockResolvedValue({ success: true, caseStatus: "open" });

    await expect(callerFor(12).nsos.cashAssurance.reviewEvidence({ schoolId: 4, evidenceId: 91, status: "accepted", linkedPaymentId: 65 })).resolves.toEqual({ success: true, caseStatus: "open" });

    expect(db.reviewPaymentEvidence).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 4, evidenceId: 91, status: "accepted", linkedPaymentId: 65, reviewedBy: 12 }));
    expect(db.recordPayment).not.toHaveBeenCalled();
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "cash_assurance_payment_evidence_reviewed", metadata: { decision: "accepted", ledgerChanged: false } }));
  });

  it("creates an approval-required reminder policy without enabling dispatch", async () => {
    vi.mocked(db.saveCashAssuranceReminderPolicy).mockResolvedValue({ policyId: 301, templateVersion: 1 });

    await expect(callerFor(12).nsos.cashAssurance.saveReminderPolicy({
      schoolId: 4,
      name: "Invoice follow-up",
      status: "active",
      triggerType: "overdue",
      channel: "in_app",
      template: "Please contact the school finance office about your invoice.",
      quietHoursStart: "20:00",
      quietHoursEnd: "08:00",
    })).resolves.toEqual({ policyId: 301, templateVersion: 1 });

    expect(db.saveCashAssuranceReminderPolicy).toHaveBeenCalledWith(expect.objectContaining({
      schoolId: 4,
      actorUserId: 12,
      timezone: "Africa/Lagos",
    }));
    expect(db.recordSecurityAuditEvent).not.toHaveBeenCalled();
  });

  it("prevents activation of unverified outbound reminder channels", async () => {
    await expect(callerFor(12).nsos.cashAssurance.saveReminderPolicy({
      schoolId: 4,
      name: "Unverified SMS",
      status: "active",
      triggerType: "overdue",
      channel: "sms",
      template: "Finance follow-up.",
      quietHoursStart: "20:00",
      quietHoursEnd: "08:00",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.saveCashAssuranceReminderPolicy).not.toHaveBeenCalled();
  });

  it("rejects invalid quiet-hour values before reaching persistence", async () => {
    await expect(callerFor(12).nsos.cashAssurance.saveReminderPolicy({
      schoolId: 4,
      name: "Invalid hours",
      status: "draft",
      triggerType: "overdue",
      channel: "in_app",
      template: "Finance follow-up.",
      quietHoursStart: "25:90",
      quietHoursEnd: "08:00",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.saveCashAssuranceReminderPolicy).not.toHaveBeenCalled();
  });

  it("proposes and approves a reminder as separate auditable steps without dispatch", async () => {
    vi.mocked(db.proposeCashAssuranceReminder).mockResolvedValue({ runId: 401, status: "proposed", duplicate: false });
    vi.mocked(db.approveCashAssuranceReminder).mockResolvedValue({ success: true, status: "approved", dispatchEnabled: false });

    await expect(callerFor(12).nsos.cashAssurance.proposeReminder({ schoolId: 4, caseId: 81, policyId: 301 }))
      .resolves.toEqual({ runId: 401, status: "proposed", duplicate: false });
    await expect(callerFor(12).nsos.cashAssurance.approveReminder({ schoolId: 4, runId: 401 }))
      .resolves.toEqual({ success: true, status: "approved", dispatchEnabled: false });

    expect(db.proposeCashAssuranceReminder).toHaveBeenCalledWith({ schoolId: 4, caseId: 81, policyId: 301, actorUserId: 12 });
    expect(db.approveCashAssuranceReminder).toHaveBeenCalledWith({ schoolId: 4, runId: 401, actorUserId: 12 });
    expect(db.recordPayment).not.toHaveBeenCalled();
  });

  it("does not expose reminder policy mutation to non-finance roles", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 2, schoolId: 4, userId: 12, role: "teacher", status: "active", createdAt: new Date(), updatedAt: new Date() });

    await expect(callerFor(12).nsos.cashAssurance.saveReminderPolicy({
      schoolId: 4,
      name: "Blocked",
      status: "active",
      triggerType: "overdue",
      channel: "in_app",
      template: "No dispatch.",
      quietHoursStart: "20:00",
      quietHoursEnd: "08:00",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.saveCashAssuranceReminderPolicy).not.toHaveBeenCalled();
  });

  it("rejects Cash Assurance actions from a non-finance school role", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 2, schoolId: 4, userId: 12, role: "teacher", status: "active", createdAt: new Date(), updatedAt: new Date() });

    await expect(callerFor(12).nsos.cashAssurance.openCase({ schoolId: 4, studentId: 22, invoiceId: 43, priority: "normal" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.openCashAssuranceCase).not.toHaveBeenCalled();
    expect(db.recordSecurityAuditEvent).not.toHaveBeenCalled();
  });
});
