import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/env", () => ({ ENV: { ownerOpenId: "platform-owner" } }));

vi.mock("./db", () => ({
  getPlatformRevenueOverview: vi.fn(),
  createSubscriptionPlan: vi.fn(),
  assignSchoolSubscription: vi.fn(),
  issuePlatformBillingRecord: vi.fn(),
  recordPlatformBillingPayment: vi.fn(),
  getSchoolSubscription: vi.fn(),
  getSchoolMembership: vi.fn(),
  recordSecurityAuditEvent: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const callerFor = (role: "admin" | "user", openId = "platform-owner") => appRouter.createCaller({
  user: { id: 1, openId, name: "NSOS Operator", email: "operator@example.com", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("NSOS platform revenue routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("limits platform revenue visibility to the configured platform owner, not every global administrator", async () => {
    vi.mocked(db.getPlatformRevenueOverview).mockResolvedValue({ plans: [], schools: [], metrics: { schoolCount: 0, activeSubscriptions: 0, paymentDueSubscriptions: 0, invoiced: 0, collected: 0 } });
    await expect(callerFor("user", "regular-user").nsos.platformRevenue.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(callerFor("admin", "another-global-admin").nsos.platformRevenue.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(callerFor("admin").nsos.platformRevenue.overview()).resolves.toMatchObject({ metrics: { schoolCount: 0 } });
  });

  it("audits subscription assignment and platform-billing settlement without accepting an amount from the browser", async () => {
    vi.mocked(db.assignSchoolSubscription).mockResolvedValue({ subscription: { id: 5 } } as any);
    vi.mocked(db.recordPlatformBillingPayment).mockResolvedValue({ schoolId: 14, billingRecordId: 51 });
    const caller = callerFor("admin");

    await caller.nsos.platformRevenue.assignSubscription({ schoolId: 14, planId: 2, status: "active", billingCycle: "annual" });
    await caller.nsos.platformRevenue.recordBillingPayment({ billingRecordId: 51, paidAt: "2026-08-18", paymentMethod: "bank_transfer", providerReference: "BANK-VERIFIED" });

    expect(db.assignSchoolSubscription).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 14, planId: 2, assignedBy: 1 }));
    expect(db.recordPlatformBillingPayment).toHaveBeenCalledWith({ billingRecordId: 51, paidAt: "2026-08-18", paymentMethod: "bank_transfer", providerReference: "BANK-VERIFIED", settledBy: 1 });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 14, eventType: "platform_billing_record_paid", targetId: 51, metadata: { paymentMethod: "bank_transfer", paymentRecorded: true } }));
  });

  it("shows a school subscription only to an active owner or administrator of that school", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 4, schoolId: 20, userId: 9, role: "owner", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(db.getSchoolSubscription).mockResolvedValue({ subscription: { status: "trial" }, plan: null, billingRecords: [] } as any);

    const ownerCaller = appRouter.createCaller({ user: { id: 9, openId: "school-owner", name: "School Owner", email: "owner@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(ownerCaller.nsos.platformRevenue.schoolSubscription({ schoolId: 20 })).resolves.toMatchObject({ subscription: { status: "trial" } });

    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 5, schoolId: 20, userId: 10, role: "staff", status: "active", createdAt: new Date(), updatedAt: new Date() });
    const staffCaller = appRouter.createCaller({ user: { id: 10, openId: "staff-user", name: "Staff", email: "staff@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(staffCaller.nsos.platformRevenue.schoolSubscription({ schoolId: 20 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
