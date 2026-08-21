import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, getSchoolMembership: vi.fn(), listTeacherSchemeReviews: vi.fn(), reviewAssignedSchemeRow: vi.fn(), publishApprovedSchemeImport: vi.fn() };
});

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function caller() {
  return appRouter.createCaller({ user: { id: 91, openId: "weekly-plan-user", name: "Weekly Plan User", email: "teacher@example.com", loginMethod: "email", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

const membership = (role: "owner" | "admin" | "teacher") => ({ id: 1, schoolId: 17, userId: 91, role, status: "active", createdAt: new Date(), updatedAt: new Date() });

describe("NSOS weekly-plan teacher approval routes", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(db.getSchoolMembership).mockResolvedValue(membership("teacher") as any); });

  it("lets a teacher retrieve and approve only their assigned weekly plans", async () => {
    vi.mocked(db.listTeacherSchemeReviews).mockResolvedValue([{ id: 4, reviewStatus: "pending_review" }] as any);
    vi.mocked(db.reviewAssignedSchemeRow).mockResolvedValue({ success: true });
    await expect(caller().nsos.academics.teacherSchemeReviews({ schoolId: 17 })).resolves.toHaveLength(1);
    await expect(caller().nsos.academics.reviewSchemeRow({ schoolId: 17, rowId: 4, decision: "approved" })).resolves.toMatchObject({ success: true });
    expect(db.reviewAssignedSchemeRow).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 17, rowId: 4, decision: "approved", reviewedByUserId: 91 }));
  });

  it("denies school management from using the teacher-only review action", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue(membership("admin") as any);
    await expect(caller().nsos.academics.reviewSchemeRow({ schoolId: 17, rowId: 4, decision: "approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.reviewAssignedSchemeRow).not.toHaveBeenCalled();
  });

  it("requires an owner or administrator to publish plans after teacher approval", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue(membership("owner") as any);
    vi.mocked(db.publishApprovedSchemeImport).mockResolvedValue({ success: true, rowCount: 6 });
    await expect(caller().nsos.academics.publishApprovedSchemeImport({ schoolId: 17, importId: 5 })).resolves.toMatchObject({ rowCount: 6 });
    expect(db.publishApprovedSchemeImport).toHaveBeenCalledWith({ schoolId: 17, importId: 5, publishedBy: 91 });
    vi.mocked(db.getSchoolMembership).mockResolvedValue(membership("teacher") as any);
    await expect(caller().nsos.academics.publishApprovedSchemeImport({ schoolId: 17, importId: 5 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
