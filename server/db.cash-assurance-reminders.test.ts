import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  cashAssuranceCases,
  cashAssuranceEvents,
  paymentEvidence,
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

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("DATABASE_URL is required for reminder database invariant tests.");
  });

  afterAll(async () => {
    if (!db) return;
    await db.delete(reminderRuns).where(eq(reminderRuns.schoolId, schoolId));
    await db.delete(reminderPolicies).where(eq(reminderPolicies.schoolId, schoolId));
    await db.delete(cashAssuranceEvents).where(eq(cashAssuranceEvents.schoolId, schoolId));
    await db.delete(securityAuditEvents).where(eq(securityAuditEvents.schoolId, schoolId));
    await db.delete(paymentEvidence).where(eq(paymentEvidence.schoolId, schoolId));
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
