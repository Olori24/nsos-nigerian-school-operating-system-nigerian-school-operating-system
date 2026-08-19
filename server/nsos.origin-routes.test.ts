import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ getSchoolMembership: vi.fn(), createStudent: vi.fn() }));
vi.mock("./db", () => db);

import { listNigerianLgas } from "./nigerianOrigin";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(): TrpcContext {
  return { user: { id: 71, openId: "origin-user", name: "Origin User", email: "user@example.ng", loginMethod: "email", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), sessionId: "origin-session" }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("NSOS origin fields on protected student creation", () => {
  const stateOfOrigin = "Lagos";
  const localGovernmentOfOrigin = listNigerianLgas(stateOfOrigin)[0];

  beforeEach(() => {
    vi.clearAllMocks();
    db.getSchoolMembership.mockResolvedValue({ schoolId: 12, userId: 71, role: "admin", status: "active" });
    db.createStudent.mockResolvedValue({ studentId: 44 });
  });

  it("stores canonical origin values on the student profile rather than a client-side LGA alias", async () => {
    await expect(appRouter.createCaller(context()).nsos.students.create({ schoolId: 12, firstName: "Ada", lastName: "Okafor", admissionNo: "NSOS-001", classId: 3, sessionId: 4, admittedOn: "2026-09-01", stateOfOrigin: "lagos", localGovernmentOfOrigin: localGovernmentOfOrigin.toUpperCase() })).resolves.toEqual({ studentId: 44 });
    expect(db.createStudent).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 12, stateOfOrigin, localGovernment: localGovernmentOfOrigin }));
    expect(db.createStudent.mock.calls[0][0]).not.toHaveProperty("localGovernmentOfOrigin");
  });

  it("rejects an LGA that does not belong to the selected State before creating a student", async () => {
    await expect(appRouter.createCaller(context()).nsos.students.create({ schoolId: 12, firstName: "Ada", lastName: "Okafor", admissionNo: "NSOS-002", classId: 3, sessionId: 4, admittedOn: "2026-09-01", stateOfOrigin, localGovernmentOfOrigin: "Not a Lagos LGA" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.createStudent).not.toHaveBeenCalled();
  });
});
