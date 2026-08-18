import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getSchoolMembership: vi.fn(),
  createInvoice: vi.fn(),
  createDepartment: vi.fn(),
  createStaffDuty: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const callerFor = (id: number) => appRouter.createCaller({ user: { id, openId: `user-${id}`, name: "NSOS User", email: "user@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("NSOS finance and staff routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a tenant-scoped invoice under a finance role", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 2, schoolId: 1, userId: 9, role: "finance", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(db.createInvoice).mockResolvedValue({ invoiceId: 71 });

    await expect(callerFor(9).nsos.finance.createInvoice({ schoolId: 1, studentId: 22, issueDate: "2026-08-18", lineItems: [{ description: "Tuition", quantity: 1, unitAmount: 150000 }] })).resolves.toEqual({ invoiceId: 71 });
    expect(db.createInvoice).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 1, studentId: 22, createdBy: 9 }));
  });

  it("allows an administrator to create a department and assign an active duty", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 3, schoolId: 1, userId: 3, role: "admin", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(db.createDepartment).mockResolvedValue({} as any);
    vi.mocked(db.createStaffDuty).mockResolvedValue({} as any);
    const caller = callerFor(3);

    await caller.nsos.staff.createDepartment({ schoolId: 1, name: "Academic Affairs", code: "ACA" });
    await caller.nsos.staff.createDuty({ schoolId: 1, staffId: 16, title: "Examination Coordinator", description: "Coordinates term examinations." });
    expect(db.createDepartment).toHaveBeenCalledWith({ schoolId: 1, name: "Academic Affairs", code: "ACA" });
    expect(db.createStaffDuty).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 1, staffId: 16, title: "Examination Coordinator" }));
  });
});
