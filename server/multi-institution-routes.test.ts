import { describe, expect, it, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({ listUserSchools: vi.fn(), createSchool: vi.fn(), getSchoolMembership: vi.fn(), getSchoolContext: vi.fn() }));
vi.mock("./db", () => db);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(): TrpcContext {
  return { user: { id: 91, openId: "multi-owner", name: "Multi Owner", email: "owner@example.ng", loginMethod: "email", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), sessionId: "multi-session" }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("NSOS multi-institution access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.listUserSchools.mockResolvedValue([
      { id: 11, name: "Greener Future Academy", shortCode: "GFA-001", state: "Ogun", operatingType: "school", role: "owner" },
      { id: 12, name: "Greener Skills Hub", shortCode: "GSH-001", state: "Ogun", operatingType: "vocational_institute", role: "owner" },
    ]);
    db.createSchool.mockResolvedValue({ schoolId: 12 });
    db.getSchoolMembership.mockResolvedValue({ schoolId: 11, userId: 91, role: "owner", status: "active" });
    db.getSchoolContext.mockResolvedValue({ school: { id: 11, name: "Greener Future Academy" }, role: "owner", terms: [] });
  });

  it("lists only the caller's active institution memberships with safe switcher metadata", async () => {
    await expect(appRouter.createCaller(context()).nsos.schools.list()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ id: 11, operatingType: "school" }), expect.objectContaining({ id: 12, operatingType: "vocational_institute" })]));
    expect(db.listUserSchools).toHaveBeenCalledWith(91);
  });

  it("lets an authenticated owner create a separate empty institution with an explicit operating type", async () => {
    await expect(appRouter.createCaller(context()).nsos.schools.create({ name: "Greener Skills Hub", shortCode: "gsh-001", state: "Ogun", operatingType: "vocational_institute" })).resolves.toEqual({ schoolId: 12 });
    expect(db.createSchool).toHaveBeenCalledWith(expect.objectContaining({ name: "Greener Skills Hub", shortCode: "GSH-001", operatingType: "vocational_institute", createdBy: 91 }));
  });

  it("denies institution context access when the active user has no membership in the selected institution", async () => {
    db.getSchoolMembership.mockResolvedValue(undefined);
    await expect(appRouter.createCaller(context()).nsos.schools.context({ schoolId: 12 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getSchoolContext).not.toHaveBeenCalled();
  });
});
