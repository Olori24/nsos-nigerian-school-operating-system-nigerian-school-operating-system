import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getSchoolMembership: vi.fn(),
  assignStaffDepartment: vi.fn(),
  createStaffDuty: vi.fn(),
  createLeaveRequest: vi.fn(),
  reviewLeaveRequest: vi.fn(),
  createPayrollRecord: vi.fn(),
  createPerformanceNote: vi.fn(),
  publishAnnouncement: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const user = {
  id: 501,
  openId: "tenant-attack-user",
  name: "School A Administrator",
  email: "admin@school-a.example",
  loginMethod: "email" as const,
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const schoolAMembership = {
  id: 1,
  schoolId: 1,
  userId: 501,
  role: "admin" as const,
  status: "active" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const caller = () =>
  appRouter.createCaller({
    user,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });

describe("NSOS adversarial tenant-boundary regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getSchoolMembership).mockImplementation(async (_userId, schoolId) =>
      schoolId === 1 ? schoolAMembership : undefined
    );
  });

  it("blocks a School A administrator from selecting School B for staff mutations", async () => {
    await expect(caller().nsos.staff.assignDepartment({
      schoolId: 2, staffId: 9002, departmentId: 7002,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(caller().nsos.staff.createDuty({
      schoolId: 2, staffId: 9002, title: "Cross-tenant duty",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(db.assignStaffDepartment).not.toHaveBeenCalled();
    expect(db.createStaffDuty).not.toHaveBeenCalled();
  });

  it("blocks a School A administrator from selecting School B for leave and payroll mutations", async () => {
    await expect(caller().nsos.staff.requestLeave({
      schoolId: 2, staffId: 9002, leaveType: "annual",
      startsOn: "2026-10-10", endsOn: "2026-10-12", reason: "Cross-tenant test",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(caller().nsos.staff.reviewLeave({
      schoolId: 2, leaveId: 8002, status: "approved",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(caller().nsos.staff.createPayroll({
      schoolId: 2, staffId: 9002, periodLabel: "October 2026", grossPay: 250000,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(db.createLeaveRequest).not.toHaveBeenCalled();
    expect(db.reviewLeaveRequest).not.toHaveBeenCalled();
    expect(db.createPayrollRecord).not.toHaveBeenCalled();
  });

  it("blocks a School A administrator from publishing a School B announcement", async () => {
    await expect(caller().nsos.communications.publish({
      schoolId: 2, announcementId: 6002,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(db.publishAnnouncement).not.toHaveBeenCalled();
  });

  it("blocks an ordinary staff member from management mutations inside its own tenant", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({
      ...schoolAMembership, role: "staff",
    });

    await expect(caller().nsos.staff.createPayroll({
      schoolId: 1, staffId: 901, periodLabel: "October 2026", grossPay: 250000,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(caller().nsos.communications.create({
      schoolId: 1,
      title: "Staff should not publish",
      body: "This write must remain management-only.",
      audience: "everyone",
      publish: true,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(caller().nsos.communications.publish({
      schoolId: 1, announcementId: 601,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(db.createPayrollRecord).not.toHaveBeenCalled();
    expect(db.createAnnouncement).not.toHaveBeenCalled();
    expect(db.publishAnnouncement).not.toHaveBeenCalled();
  });
});
