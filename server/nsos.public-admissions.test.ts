import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getSchoolByCode: vi.fn(),
  createPublicApplicationWithDocuments: vi.fn(),
  extractBiodataFromDocument: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const caller = () => appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
const baseSubmission = { shortCode: "CGC", firstName: "Ada", lastName: "Okafor", guardianName: "Ifeoma Okafor", guardianPhone: "08000000000" };

describe("NSOS public admissions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves a public school profile by its admissions code", async () => {
    vi.mocked(db.getSchoolByCode).mockResolvedValue({ id: 18, name: "Cedar Grove College", shortCode: "CGC", state: "Lagos" });
    await expect(caller().nsos.admissions.publicSchool({ shortCode: "CGC" })).resolves.toMatchObject({ id: 18, name: "Cedar Grove College" });
    expect(db.getSchoolByCode).toHaveBeenCalledWith("CGC");
  });

  it("returns reviewed document suggestions without creating an application", async () => {
    vi.mocked(db.extractBiodataFromDocument).mockResolvedValue({ proposal: { firstName: "Ada", lastName: "Okafor" }, requiresConfirmation: true, documentStored: false } as any);
    await expect(caller().nsos.admissions.extractBiodata({ upload: { base64: "aGVsbG8=", fileName: "id.png", mimeType: "image/png" } })).resolves.toMatchObject({ proposal: { firstName: "Ada" }, requiresConfirmation: true, documentStored: false });
    expect(db.createPublicApplicationWithDocuments).not.toHaveBeenCalled();
  });

  it("rejects submissions addressed to an unknown school code", async () => {
    vi.mocked(db.getSchoolByCode).mockResolvedValue(undefined);
    await expect(caller().nsos.admissions.publicSubmit(baseSubmission)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.createPublicApplicationWithDocuments).not.toHaveBeenCalled();
  });

  it("creates a tenant-scoped application when the school admissions link is valid", async () => {
    vi.mocked(db.getSchoolByCode).mockResolvedValue({ id: 18, name: "Cedar Grove College", shortCode: "CGC", state: "Lagos" });
    vi.mocked(db.createPublicApplicationWithDocuments).mockResolvedValue({ applicationId: 44 });
    await expect(caller().nsos.admissions.publicSubmit({ ...baseSubmission, guardianEmail: "guardian@example.com" })).resolves.toEqual({ applicationId: 44 });
    expect(db.createPublicApplicationWithDocuments).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 18, firstName: "Ada", guardianEmail: "guardian@example.com", documents: [] }));
  });

  it("requires the configured declaration and retains only template-enabled supplemental fields", async () => {
    vi.mocked(db.getSchoolByCode).mockResolvedValue({ id: 18, name: "Cedar Grove College", shortCode: "CGC", state: "Lagos", admissionTemplate: { admissionTitle: "Admission form", headerTagline: "School admissions", admissionFields: ["dateOfBirth"], declarationText: "I confirm this information is correct.", requireDeclaration: true } });
    vi.mocked(db.createPublicApplicationWithDocuments).mockResolvedValue({ applicationId: 45 });
    await expect(caller().nsos.admissions.publicSubmit({ ...baseSubmission, supplementalData: { dateOfBirth: "2017-01-15" } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().nsos.admissions.publicSubmit({ ...baseSubmission, supplementalData: { dateOfBirth: "2017-01-15", medicalHistory: "Not enabled by this school" }, declarationAccepted: true })).resolves.toEqual({ applicationId: 45 });
    expect(db.createPublicApplicationWithDocuments).toHaveBeenLastCalledWith(expect.objectContaining({ schoolId: 18, dateOfBirth: "2017-01-15", declarationAccepted: true, supplementalData: { dateOfBirth: "2017-01-15" } }));
  });

  it("requires only school-configured passport and receipt uploads, then passes typed evidence to secure persistence", async () => {
    vi.mocked(db.getSchoolByCode).mockResolvedValue({ id: 18, name: "Cedar Grove College", shortCode: "CGC", state: "Lagos", admissionTemplate: { admissionTitle: "Admission form", headerTagline: "School admissions", admissionFields: [], declarationText: "", requireDeclaration: false, requirePassportPhoto: true, requireAdmissionFeeReceipt: true } });
    vi.mocked(db.createPublicApplicationWithDocuments).mockResolvedValue({ applicationId: 52 });
    await expect(caller().nsos.admissions.publicSubmit(baseSubmission)).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("passport") });
    const documents = [{ type: "passport_photo" as const, fileName: "ada.jpg", mimeType: "image/jpeg" as const, base64: "aGVsbG8=" }, { type: "admission_fee_receipt" as const, fileName: "receipt.pdf", mimeType: "application/pdf" as const, base64: "JVBERg==" }];
    await expect(caller().nsos.admissions.publicSubmit({ ...baseSubmission, documents })).resolves.toEqual({ applicationId: 52 });
    expect(db.createPublicApplicationWithDocuments).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 18, documents }));
  });

  it("rejects duplicate evidence types before an application or storage record is created", async () => {
    vi.mocked(db.getSchoolByCode).mockResolvedValue({ id: 18, name: "Cedar Grove College", shortCode: "CGC", state: "Lagos" });
    await expect(caller().nsos.admissions.publicSubmit({ ...baseSubmission, documents: [{ type: "passport_photo", fileName: "one.jpg", mimeType: "image/jpeg", base64: "aGVsbG8=" }, { type: "passport_photo", fileName: "two.jpg", mimeType: "image/jpeg", base64: "aGVsbG8=" }] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.createPublicApplicationWithDocuments).not.toHaveBeenCalled();
  });

  it("returns nationwide selector options and accepts only a configured State-to-LGA pair", async () => {
    const origins = await caller().nsos.admissions.originOptions({ state: "Lagos" });
    const stateOfOrigin = "Lagos";
    const localGovernmentOfOrigin = origins.lgas[0];
    expect(origins.states).toContain(stateOfOrigin);
    expect(localGovernmentOfOrigin).toBeTruthy();
    vi.mocked(db.getSchoolByCode).mockResolvedValue({ id: 18, name: "Cedar Grove College", shortCode: "CGC", state: "Lagos", admissionTemplate: { admissionTitle: "Admission form", headerTagline: "School admissions", admissionFields: ["stateOfOrigin", "localGovernmentOfOrigin"], declarationText: "", requireDeclaration: false } });
    vi.mocked(db.createPublicApplicationWithDocuments).mockResolvedValue({ applicationId: 46 });
    await expect(caller().nsos.admissions.publicSubmit({ ...baseSubmission, supplementalData: { stateOfOrigin: "lagos", localGovernmentOfOrigin: localGovernmentOfOrigin.toUpperCase() } })).resolves.toEqual({ applicationId: 46 });
    expect(db.createPublicApplicationWithDocuments).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 18, supplementalData: { stateOfOrigin, localGovernmentOfOrigin } }));
    await expect(caller().nsos.admissions.publicSubmit({ ...baseSubmission, supplementalData: { stateOfOrigin, localGovernmentOfOrigin: "Not a Lagos LGA" } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
