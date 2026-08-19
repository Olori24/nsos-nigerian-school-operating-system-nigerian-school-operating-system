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

  it("requires the configured declaration and retains only template-enabled supplemental fields", async () => {
    vi.mocked(db.getSchoolByCode).mockResolvedValue({ id: 18, name: "Cedar Grove College", shortCode: "CGC", state: "Lagos", admissionTemplate: { admissionTitle: "Admission form", headerTagline: "School admissions", admissionFields: ["dateOfBirth"], declarationText: "I confirm this information is correct.", requireDeclaration: true } });
    vi.mocked(db.createApplication).mockResolvedValue({ applicationId: 45 });

    await expect(caller().nsos.admissions.publicSubmit({ shortCode: "CGC", firstName: "Ada", lastName: "Okafor", guardianName: "Ifeoma Okafor", guardianPhone: "08000000000", supplementalData: { dateOfBirth: "2017-01-15" } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().nsos.admissions.publicSubmit({ shortCode: "CGC", firstName: "Ada", lastName: "Okafor", guardianName: "Ifeoma Okafor", guardianPhone: "08000000000", supplementalData: { dateOfBirth: "2017-01-15", medicalHistory: "Not enabled by this school" }, declarationAccepted: true })).resolves.toEqual({ applicationId: 45 });
    expect(db.createApplication).toHaveBeenLastCalledWith(expect.objectContaining({ schoolId: 18, dateOfBirth: "2017-01-15", declarationAccepted: true, supplementalData: { dateOfBirth: "2017-01-15" } }));
  });

  it("returns nationwide selector options and accepts only a configured State-to-LGA pair", async () => {
    const origins = await caller().nsos.admissions.originOptions({ state: "Lagos" });
    const stateOfOrigin = "Lagos";
    const localGovernmentOfOrigin = origins.lgas[0];
    expect(origins.states).toContain(stateOfOrigin);
    expect(localGovernmentOfOrigin).toBeTruthy();
    vi.mocked(db.getSchoolByCode).mockResolvedValue({ id: 18, name: "Cedar Grove College", shortCode: "CGC", state: "Lagos", admissionTemplate: { admissionTitle: "Admission form", headerTagline: "School admissions", admissionFields: ["stateOfOrigin", "localGovernmentOfOrigin"], declarationText: "", requireDeclaration: false } });
    vi.mocked(db.createApplication).mockResolvedValue({ applicationId: 46 });

    await expect(caller().nsos.admissions.publicSubmit({ shortCode: "CGC", firstName: "Ada", lastName: "Okafor", guardianName: "Ifeoma Okafor", guardianPhone: "08000000000", supplementalData: { stateOfOrigin: "lagos", localGovernmentOfOrigin: localGovernmentOfOrigin.toUpperCase() } })).resolves.toEqual({ applicationId: 46 });
    expect(db.createApplication).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 18, supplementalData: { stateOfOrigin, localGovernmentOfOrigin } }));

    await expect(caller().nsos.admissions.publicSubmit({ shortCode: "CGC", firstName: "Ada", lastName: "Okafor", guardianName: "Ifeoma Okafor", guardianPhone: "08000000000", supplementalData: { stateOfOrigin, localGovernmentOfOrigin: "Not a Lagos LGA" } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
