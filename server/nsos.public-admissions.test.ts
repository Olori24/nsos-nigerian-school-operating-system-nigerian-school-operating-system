import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getSchoolByCode: vi.fn(),
  createApplication: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const caller = () => appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("NSOS public admissions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves a public school profile by its admissions code", async () => {
    vi.mocked(db.getSchoolByCode).mockResolvedValue({ id: 18, name: "Cedar Grove College", shortCode: "CGC", state: "Lagos" });

    await expect(caller().nsos.admissions.publicSchool({ shortCode: "CGC" })).resolves.toMatchObject({ id: 18, name: "Cedar Grove College" });
    expect(db.getSchoolByCode).toHaveBeenCalledWith("CGC");
  });

  it("rejects submissions addressed to an unknown school code", async () => {
    vi.mocked(db.getSchoolByCode).mockResolvedValue(undefined);

    await expect(caller().nsos.admissions.publicSubmit({ shortCode: "MISSING", firstName: "Ada", lastName: "Okafor", guardianName: "Ifeoma Okafor", guardianPhone: "08000000000" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.createApplication).not.toHaveBeenCalled();
  });

  it("creates a tenant-scoped application when the school admissions link is valid", async () => {
    vi.mocked(db.getSchoolByCode).mockResolvedValue({ id: 18, name: "Cedar Grove College", shortCode: "CGC", state: "Lagos" });
    vi.mocked(db.createApplication).mockResolvedValue({ applicationId: 44 });

    await expect(caller().nsos.admissions.publicSubmit({ shortCode: "CGC", firstName: "Ada", lastName: "Okafor", guardianName: "Ifeoma Okafor", guardianPhone: "08000000000", guardianEmail: "guardian@example.com" })).resolves.toEqual({ applicationId: 44 });
    expect(db.createApplication).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 18, firstName: "Ada", guardianEmail: "guardian@example.com" }));
  });
});
