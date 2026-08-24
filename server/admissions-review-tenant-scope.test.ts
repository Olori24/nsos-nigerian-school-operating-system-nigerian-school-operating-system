import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ getSchoolMembership: vi.fn(), reviewApplication: vi.fn(), recordSecurityAuditEvent: vi.fn() }));
vi.mock("./db", async importOriginal => ({ ...(await importOriginal<typeof import("./db")>()), ...db }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const user = { id: 119, openId: "multi-school-reviewer", name: "Reviewer", email: "reviewer@example.com", loginMethod: "email", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const caller = () => appRouter.createCaller({ user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("admission review tenant scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.getSchoolMembership.mockResolvedValue({ id: 7, schoolId: 34, userId: 119, role: "owner", status: "active" });
    db.reviewApplication.mockResolvedValue({ success: true });
    db.recordSecurityAuditEvent.mockResolvedValue(undefined);
  });

  it("passes the active school ID into the review mutation so a reviewer with multiple memberships cannot update a guessed application from another tenant", async () => {
    await expect(caller().nsos.admissions.review({ schoolId: 34, applicationId: 902, status: "accepted", decisionNote: "Approved after review." })).resolves.toEqual({ success: true });
    expect(db.reviewApplication).toHaveBeenCalledWith({ schoolId: 34, applicationId: 902, status: "accepted", decisionNote: "Approved after review.", reviewerId: 119 });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 34, targetId: 902 }));
  });

  it("does not record an audit event when the tenant-scoped database mutation rejects a foreign application ID", async () => {
    db.reviewApplication.mockRejectedValue(new Error("Admission application not found in this school."));
    await expect(caller().nsos.admissions.review({ schoolId: 34, applicationId: 903, status: "declined", decisionNote: "Not a record in this tenant." })).rejects.toThrow("Admission application not found in this school.");
    expect(db.recordSecurityAuditEvent).not.toHaveBeenCalled();
  });
});
