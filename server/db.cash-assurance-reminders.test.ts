import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import {
  cashAssuranceCases,
  cashAssuranceEvents,
  cashAssuranceCaseInvoices,
  invoices,
  paymentEvidence,
  paymentPromises,
  reminderPolicies,
  reminderRuns,
  securityAuditEvents,
} from "../drizzle/schema";
import {
  archiveCashAssuranceReminderPolicy,
  approveCashAssuranceReminder,
  cancelCashAssuranceReminder,
  getDb,
  proposeCashAssuranceReminder,
  saveCashAssuranceReminderPolicy,
} from "./db";

const databaseEnabled = Boolean(process.env.DATABASE_URL);
const schoolId = 1_500_000_000 + Math.floor(Math.random() * 400_000_000);
const actorUserId = 1_700_000_001;

describe.skipIf(!databaseEnabled)("Cash Assurance reminder database invariants", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let auditConstraintName: string | null = null;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("DATABASE_URL is required for reminder database invariant tests.");
  });

  afterAll(async () => {
    if (!db) return;
    if (auditConstraintName) {
      try { await (db as any).$client.promise().query("ALTER TABLE securityAuditEvents DROP CHECK " + auditConstraintName); } catch { /* Best-effort cleanup after a failed DDL setup. */ }
    }
    await db.delete(reminderRuns).where(eq(reminderRuns.schoolId, schoolId));
    await db.delete(reminderPolicies).where(eq(reminderPolicies.schoolId, schoolId));
    await db.delete(cashAssuranceEvents).where(eq(cashAssuranceEvents.schoolId, schoolId));
    await db.delete(securityAuditEvents).where(eq(securityAuditEvents.schoolId, schoolId));
    await db.delete(paymentEvidence).where(eq(paymentEvidence.schoolId, schoolId));
    await db.delete(paymentPromises).where(eq(paymentPromises.schoolId, schoolId));
    const testCases = await db.select({ id: cashAssuranceCases.id }).from(cashAssuranceCases).where(eq(cashAssuranceCases.schoolId, schoolId));
    if (testCases.length) await db.delete(cashAssuranceCaseInvoices).where(inArray(cashAssuranceCaseInvoices.caseId, testCases.map(item => item.id)));
    await db.delete(invoices).where(eq(invoices.schoolId, schoolId));
    await db.delete(cashAssuranceCases).where(eq(cashAssuranceCases.schoolId, schoolId));
    const pool = (db as any).$client;
    if (pool?.end) await new Promise<void>((resolve, reject) => pool.end((error?: Error) => error ? reject(error) : resolve()));
  });

  it("serializes policy versions, deduplicates proposals, and commits lifecycle events with state", async () => {
    const createdCase = await db!.insert(cashAssuranceCases).values({
      schoolId,
      studentId: 11,
      openedBy: actorUserId,
    });
    const caseId = Number(createdCase[0].insertId);
    await db!.insert(paymentEvidence).values({
      schoolId,
      caseId,
      invoiceId: 987654321,
      amountClaimed: "100.00",
      createdBy: actorUserId,
    });

    const initialPolicy = await saveCashAssuranceReminderPolicy({
      schoolId,
      name: "Evidence review",
      status: "active",
      triggerType: "evidence_received",
      channel: "in_app",
      template: "Please contact the school finance office.",
      quietHoursStart: "20:00",
      quietHoursEnd: "08:00",
      timezone: "Africa/Lagos",
      actorUserId,
    });

    const edits = await Promise.all([
      saveCashAssuranceReminderPolicy({
        schoolId,
        policyId: initialPolicy.policyId,
        name: "Evidence review A",
        status: "active",
        triggerType: "evidence_received",
        channel: "in_app",
        template: "Template A",
        quietHoursStart: "20:00",
        quietHoursEnd: "08:00",
        timezone: "Africa/Lagos",
        actorUserId,
      }),
      saveCashAssuranceReminderPolicy({
        schoolId,
        policyId: initialPolicy.policyId,
        name: "Evidence review B",
        status: "active",
        triggerType: "evidence_received",
        channel: "in_app",
        template: "Template B",
        quietHoursStart: "20:00",
        quietHoursEnd: "08:00",
        timezone: "Africa/Lagos",
        actorUserId,
      }),
    ]);
    expect(edits.map(edit => edit.templateVersion).sort()).toEqual([2, 3]);

    await expect(proposeCashAssuranceReminder({
      schoolId,
      caseId,
      policyId: initialPolicy.policyId,
      actorUserId: 2_147_483_648,
    })).rejects.toThrow();
    const rolledBackProposal = await db!.select().from(reminderRuns).where(eq(reminderRuns.schoolId, schoolId));
    expect(rolledBackProposal).toHaveLength(0);

    const [proposal, duplicate] = await Promise.all([
      proposeCashAssuranceReminder({
        schoolId,
        caseId,
        policyId: initialPolicy.policyId,
        actorUserId,
      }),
      proposeCashAssuranceReminder({
        schoolId,
        caseId,
        policyId: initialPolicy.policyId,
        actorUserId,
      }),
    ]);
    expect([proposal, duplicate].filter(result => !result.duplicate)).toHaveLength(1);
    expect([proposal, duplicate].filter(result => result.duplicate)).toHaveLength(1);
    expect(proposal.runId).toBe(duplicate.runId);
    expect([proposal.status, duplicate.status]).toContain("proposed");

    await approveCashAssuranceReminder({ schoolId, runId: proposal.runId, actorUserId });
    const approved = (await db!.select().from(reminderRuns).where(eq(reminderRuns.id, proposal.runId)).limit(1))[0];
    expect(approved.status).toBe("approved");
    const approvedEvents = await db!.select().from(cashAssuranceEvents).where(eq(cashAssuranceEvents.caseId, caseId));
    expect(approvedEvents.map(event => event.eventType)).toEqual(expect.arrayContaining(["reminder_proposed", "reminder_approved"]));
    const auditRows = await db!.select().from(securityAuditEvents).where(eq(securityAuditEvents.schoolId, schoolId));
    expect(auditRows.map(event => event.eventType)).toEqual(expect.arrayContaining([
      "cash_assurance_reminder_policy_saved",
      "cash_assurance_reminder_proposed",
      "cash_assurance_reminder_approved",
    ]));

    const localDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const yesterdayDate = new Date(localDate + "T00:00:00.000Z");
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterday = yesterdayDate.toISOString().slice(0, 10);

    const invoiceDueCase = await db!.insert(cashAssuranceCases).values({ schoolId, studentId: 21, openedBy: actorUserId });
    const invoiceDueCaseId = Number(invoiceDueCase[0].insertId);
    const dueInvoice = await db!.insert(invoices).values({
      schoolId, studentId: 21, invoiceNo: "REM-DUE-" + schoolId, issueDate: new Date(localDate + "T00:00:00.000Z"),
      dueDate: new Date(localDate + "T00:00:00.000Z"), subtotal: "100.00", total: "100.00", status: "issued", createdBy: actorUserId,
    });
    await db!.insert(cashAssuranceCaseInvoices).values({
      caseId: invoiceDueCaseId, invoiceId: Number(dueInvoice[0].insertId), snapshotOutstandingAmount: "100.00",
    });
    const duePolicy = await saveCashAssuranceReminderPolicy({
      schoolId, name: "Invoice due", status: "active", triggerType: "invoice_due", channel: "in_app",
      template: "Invoice due reminder.", quietHoursStart: "20:00", quietHoursEnd: "08:00", timezone: "Africa/Lagos", actorUserId,
    });
    const dueProposal = await proposeCashAssuranceReminder({ schoolId, caseId: invoiceDueCaseId, policyId: duePolicy.policyId, actorUserId });
    expect(dueProposal.status).toBe("proposed");

    const overdueCase = await db!.insert(cashAssuranceCases).values({ schoolId, studentId: 22, openedBy: actorUserId });
    const overdueCaseId = Number(overdueCase[0].insertId);
    const overdueInvoice = await db!.insert(invoices).values({
      schoolId, studentId: 22, invoiceNo: "REM-OVERDUE-" + schoolId, issueDate: new Date(yesterday + "T00:00:00.000Z"),
      dueDate: new Date(yesterday + "T00:00:00.000Z"), subtotal: "150.00", total: "150.00", status: "issued", createdBy: actorUserId,
    });
    await db!.insert(cashAssuranceCaseInvoices).values({
      caseId: overdueCaseId, invoiceId: Number(overdueInvoice[0].insertId), snapshotOutstandingAmount: "150.00",
    });
    const overduePolicy = await saveCashAssuranceReminderPolicy({
      schoolId, name: "Overdue invoice", status: "active", triggerType: "overdue", channel: "in_app",
      template: "Overdue invoice reminder.", quietHoursStart: "20:00", quietHoursEnd: "08:00", timezone: "Africa/Lagos", actorUserId,
    });
    const overdueProposal = await proposeCashAssuranceReminder({ schoolId, caseId: overdueCaseId, policyId: overduePolicy.policyId, actorUserId });
    expect(overdueProposal.status).toBe("proposed");

    const promiseCase = await db!.insert(cashAssuranceCases).values({ schoolId, studentId: 23, openedBy: actorUserId });
    const promiseCaseId = Number(promiseCase[0].insertId);
    await db!.insert(paymentPromises).values({
      schoolId, caseId: promiseCaseId, promisedAmount: "200.00", promisedOn: new Date(localDate + "T00:00:00.000Z"),
      status: "open", recordedBy: actorUserId,
    });
    const promisePolicy = await saveCashAssuranceReminderPolicy({
      schoolId, name: "Promise due", status: "active", triggerType: "promise_due", channel: "in_app",
      template: "Promise due reminder.", quietHoursStart: "20:00", quietHoursEnd: "08:00", timezone: "Africa/Lagos", actorUserId,
    });
    const promiseProposal = await proposeCashAssuranceReminder({ schoolId, caseId: promiseCaseId, policyId: promisePolicy.policyId, actorUserId });
    expect(promiseProposal.status).toBe("proposed");

    const versionCase = await db!.insert(cashAssuranceCases).values({ schoolId, studentId: 24, openedBy: actorUserId });
    const versionCaseId = Number(versionCase[0].insertId);
    await db!.insert(paymentEvidence).values({
      schoolId, caseId: versionCaseId, invoiceId: 987654325, amountClaimed: "30.00", createdBy: actorUserId,
    });
    const versionPolicy = await saveCashAssuranceReminderPolicy({
      schoolId, name: "Version guard", status: "active", triggerType: "evidence_received", channel: "in_app",
      template: "Version 1.", quietHoursStart: "20:00", quietHoursEnd: "08:00", timezone: "Africa/Lagos", actorUserId,
    });
    const versionProposal = await proposeCashAssuranceReminder({ schoolId, caseId: versionCaseId, policyId: versionPolicy.policyId, actorUserId });
    await saveCashAssuranceReminderPolicy({
      schoolId, policyId: versionPolicy.policyId, name: "Version guard updated", status: "active",
      triggerType: "evidence_received", channel: "in_app", template: "Version 2.",
      quietHoursStart: "20:00", quietHoursEnd: "08:00", timezone: "Africa/Lagos", actorUserId,
    });
    await expect(approveCashAssuranceReminder({ schoolId, runId: versionProposal.runId, actorUserId })).rejects.toThrow(/policy/i);
    const versionRun = (await db!.select().from(reminderRuns).where(eq(reminderRuns.id, versionProposal.runId)).limit(1))[0];
    expect(versionRun.status).toBe("proposed");

    const approvalRollbackCase = await db!.insert(cashAssuranceCases).values({ schoolId, studentId: 25, openedBy: actorUserId });
    const approvalRollbackCaseId = Number(approvalRollbackCase[0].insertId);
    await db!.insert(paymentEvidence).values({
      schoolId, caseId: approvalRollbackCaseId, invoiceId: 987654326, amountClaimed: "45.00", createdBy: actorUserId,
    });
    const approvalRollbackPolicy = await saveCashAssuranceReminderPolicy({
      schoolId, name: "Approval rollback", status: "active", triggerType: "evidence_received", channel: "in_app",
      template: "Approval rollback test.", quietHoursStart: "20:00", quietHoursEnd: "08:00", timezone: "Africa/Lagos", actorUserId,
    });
    const approvalRollbackProposal = await proposeCashAssuranceReminder({
      schoolId, caseId: approvalRollbackCaseId, policyId: approvalRollbackPolicy.policyId, actorUserId,
    });
    const pool = (db as any).$client;
    auditConstraintName = "test_cash_reminder_approval_audit_" + schoolId;
    await pool.promise().query(
      "ALTER TABLE securityAuditEvents ADD CONSTRAINT " + auditConstraintName +
      " CHECK (NOT (eventType = 'cash_assurance_reminder_approved' AND targetId = '" + approvalRollbackProposal.runId + "'))",
    );
    try {
      await expect(approveCashAssuranceReminder({
        schoolId, runId: approvalRollbackProposal.runId, actorUserId,
      })).rejects.toThrow();
    } finally {
      await pool.promise().query("ALTER TABLE securityAuditEvents DROP CHECK " + auditConstraintName);
      auditConstraintName = null;
    }
    const approvalRollbackRun = (await db!.select().from(reminderRuns).where(eq(reminderRuns.id, approvalRollbackProposal.runId)).limit(1))[0];
    expect(approvalRollbackRun.status).toBe("proposed");
    const rollbackEvents = await db!.select().from(cashAssuranceEvents).where(eq(cashAssuranceEvents.caseId, approvalRollbackCaseId));
    expect(rollbackEvents.map(event => event.eventType)).not.toContain("reminder_approved");

    const disputedCase = await db!.insert(cashAssuranceCases).values({
      schoolId,
      studentId: 12,
      status: "disputed",
      pausedReason: "Evidence under dispute",
      openedBy: actorUserId,
    });
    const disputedCaseId = Number(disputedCase[0].insertId);
    await db!.insert(paymentEvidence).values({
      schoolId,
      caseId: disputedCaseId,
      invoiceId: 987654322,
      amountClaimed: "50.00",
      createdBy: actorUserId,
    });
    await expect(proposeCashAssuranceReminder({
      schoolId,
      caseId: disputedCaseId,
      policyId: initialPolicy.policyId,
      actorUserId,
    })).rejects.toThrow(/disputed|paused/i);

    const cancellableCase = await db!.insert(cashAssuranceCases).values({
      schoolId,
      studentId: 13,
      openedBy: actorUserId,
    });
    const cancellableCaseId = Number(cancellableCase[0].insertId);
    await db!.insert(paymentEvidence).values({
      schoolId,
      caseId: cancellableCaseId,
      invoiceId: 987654323,
      amountClaimed: "75.00",
      createdBy: actorUserId,
    });
    const secondPolicy = await saveCashAssuranceReminderPolicy({
      schoolId,
      name: "Cancellation test",
      status: "active",
      triggerType: "evidence_received",
      channel: "in_app",
      template: "Review submitted evidence.",
      quietHoursStart: "20:00",
      quietHoursEnd: "08:00",
      timezone: "Africa/Lagos",
      actorUserId,
    });
    const pending = await proposeCashAssuranceReminder({
      schoolId,
      caseId: cancellableCaseId,
      policyId: secondPolicy.policyId,
      actorUserId,
    });
    await expect(cancelCashAssuranceReminder({
      schoolId,
      runId: pending.runId,
      actorUserId: 2_147_483_648,
    })).rejects.toThrow();
    const pendingAfterRollback = (await db!.select().from(reminderRuns).where(eq(reminderRuns.id, pending.runId)).limit(1))[0];
    expect(pendingAfterRollback.status).toBe("proposed");
    await cancelCashAssuranceReminder({ schoolId, runId: pending.runId, actorUserId });
    const cancelled = (await db!.select().from(reminderRuns).where(eq(reminderRuns.id, pending.runId)).limit(1))[0];
    expect(cancelled.status).toBe("cancelled");
    const cancellationEvents = await db!.select().from(cashAssuranceEvents).where(eq(cashAssuranceEvents.caseId, cancellableCaseId));
    expect(cancellationEvents.map(event => event.eventType)).toContain("reminder_cancelled");
    const cancellationAudit = await db!.select().from(securityAuditEvents).where(eq(securityAuditEvents.schoolId, schoolId));
    expect(cancellationAudit.map(event => event.eventType)).toContain("cash_assurance_reminder_cancelled");

    const staleCase = await db!.insert(cashAssuranceCases).values({
      schoolId,
      studentId: 14,
      openedBy: actorUserId,
    });
    const staleCaseId = Number(staleCase[0].insertId);
    await db!.insert(paymentEvidence).values({
      schoolId,
      caseId: staleCaseId,
      invoiceId: 987654324,
      amountClaimed: "25.00",
      createdBy: actorUserId,
    });
    const staleProposal = await proposeCashAssuranceReminder({
      schoolId,
      caseId: staleCaseId,
      policyId: secondPolicy.policyId,
      actorUserId,
    });
    await archiveCashAssuranceReminderPolicy({ schoolId, policyId: secondPolicy.policyId, actorUserId });
    await expect(approveCashAssuranceReminder({ schoolId, runId: staleProposal.runId, actorUserId })).rejects.toThrow(/policy/i);
    const staleRun = (await db!.select().from(reminderRuns).where(eq(reminderRuns.id, staleProposal.runId)).limit(1))[0];
    expect(staleRun.status).toBe("proposed");
  });
});
