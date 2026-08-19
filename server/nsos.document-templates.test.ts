import { beforeEach, describe, expect, it, vi } from "vitest";

const templateDb = vi.hoisted(() => ({
  getSchoolMembership: vi.fn(),
  getSchoolDocumentTemplate: vi.fn(),
  saveSchoolDocumentTemplate: vi.fn(),
  createDraftFeesFromTemplate: vi.fn(),
  recordSecurityAuditEvent: vi.fn(),
}));

vi.mock("./db", () => templateDb);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(): TrpcContext {
  return {
    user: { id: 71, openId: "template-owner", name: "Template Owner", email: "owner@example.ng", loginMethod: "email", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), sessionId: "session-template" },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const input = {
  schoolId: 12,
  admissionTitle: "School admission form",
  headerTagline: "Nursery · Primary · College",
  headerLogoUrl: "https://cdn.example.ng/logo.png",
  headerAddressLine: "Sample campus address",
  headerContactLine: "0800 000 0000 · admissions@example.ng",
  admissionFields: ["dateOfBirth", "medicalHistory"] as const,
  declarationText: "I confirm this information is correct.",
  requireDeclaration: true,
  termlyFeeTitle: "Termly fee guide",
  feeSchedule: [{ category: "Primary 1–3", tuitionFee: 18000 }],
};

describe("NSOS document templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    templateDb.getSchoolMembership.mockResolvedValue({ schoolId: 12, userId: 71, role: "owner", status: "active" });
  });

  it("allows only an owner or administrator to save a tenant-scoped template and audits the change", async () => {
    templateDb.saveSchoolDocumentTemplate.mockResolvedValue({ ...input, id: 2, updatedBy: 71 });
    await expect(appRouter.createCaller(context()).nsos.documentTemplates.save(input)).resolves.toMatchObject({ schoolId: 12, admissionTitle: "School admission form" });
    expect(templateDb.saveSchoolDocumentTemplate).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 12, updatedBy: 71, headerLogoUrl: "https://cdn.example.ng/logo.png", headerAddressLine: "Sample campus address", headerContactLine: "0800 000 0000 · admissions@example.ng", feeSchedule: [{ category: "Primary 1–3", tuitionFee: 18000 }] }));
    expect(templateDb.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 12, actorUserId: 71, eventType: "school_document_template_saved", metadata: expect.objectContaining({ brandedHeaderConfigured: true }) }));
  });

  it("rejects a non-HTTPS logo URL before it reaches tenant storage", async () => {
    await expect(appRouter.createCaller(context()).nsos.documentTemplates.save({ ...input, headerLogoUrl: "http://unsafe.example.ng/logo.png" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(templateDb.saveSchoolDocumentTemplate).not.toHaveBeenCalled();
  });

  it("refuses a staff member even if they can read communications", async () => {
    templateDb.getSchoolMembership.mockResolvedValue({ schoolId: 12, userId: 71, role: "staff", status: "active" });
    await expect(appRouter.createCaller(context()).nsos.documentTemplates.get({ schoolId: 12 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(templateDb.getSchoolDocumentTemplate).not.toHaveBeenCalled();
  });

  it("creates draft fee structures only after an owner deliberately adopts the saved guide", async () => {
    templateDb.createDraftFeesFromTemplate.mockResolvedValue({ createdCount: 1, status: "draft" });
    await expect(appRouter.createCaller(context()).nsos.documentTemplates.adoptFeeSchedule({ schoolId: 12, termId: 4 })).resolves.toEqual({ createdCount: 1, status: "draft" });
    expect(templateDb.createDraftFeesFromTemplate).toHaveBeenCalledWith({ schoolId: 12, termId: 4 });
    expect(templateDb.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "termly_fee_template_adopted", metadata: expect.objectContaining({ status: "draft", createdCount: 1 }) }));
  });
});
