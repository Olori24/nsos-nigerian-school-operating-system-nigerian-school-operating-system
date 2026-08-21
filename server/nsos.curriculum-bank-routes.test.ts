import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, getSchoolMembership: vi.fn(), applyNigerianCurriculumTemplate: vi.fn(), createSchoolBankAccount: vi.fn(), updateSchoolBankAccountStatus: vi.fn() };
});

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function caller() {
  return appRouter.createCaller({ user: { id: 44, openId: "setup-owner", name: "Setup Owner", email: "owner@example.com", loginMethod: "email", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

const adminMembership = { id: 2, schoolId: 1, userId: 44, role: "admin", status: "active", createdAt: new Date(), updatedAt: new Date() } as const;

describe("NSOS curriculum and bank-account setup routes", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(db.getSchoolMembership).mockResolvedValue(adminMembership as any); });

  it("applies a reviewed Nigerian curriculum template only through the school-scoped service", async () => {
    vi.mocked(db.applyNigerianCurriculumTemplate).mockResolvedValue({ template: "NERDC Basic Education — Primary", createdSubjectCount: 6, classSubjectLinks: 12, classIds: [10, 11] });
    await expect(caller().nsos.academics.applyNigerianCurriculumTemplate({ schoolId: 1, templateId: "basic_primary", classIds: [10, 11], includeOptional: false })).resolves.toMatchObject({ createdSubjectCount: 6 });
    expect(db.applyNigerianCurriculumTemplate).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 1, appliedBy: 44, classIds: [10, 11] }));
  });

  it("stores physical bank-account input only through the owner/admin server-side service", async () => {
    vi.mocked(db.createSchoolBankAccount).mockResolvedValue({ bankAccountId: 9, accountNumberMasked: "••••••6789" });
    await expect(caller().nsos.finance.createBankAccount({ schoolId: 1, bankName: "Example Bank", accountName: "Example School", accountNumber: "0123456789", accountType: "current", status: "draft", isPrimary: true })).resolves.toMatchObject({ accountNumberMasked: "••••••6789" });
    expect(db.createSchoolBankAccount).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 1, configuredBy: 44, accountNumber: "0123456789" }));
  });

  it("rejects curriculum and physical bank-account changes from a teacher role", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ ...adminMembership, role: "teacher" } as any);
    await expect(caller().nsos.academics.applyNigerianCurriculumTemplate({ schoolId: 1, templateId: "basic_primary", classIds: [10], includeOptional: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().nsos.finance.createBankAccount({ schoolId: 1, bankName: "Example Bank", accountName: "Example School", accountNumber: "0123456789", accountType: "current", status: "draft", isPrimary: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.applyNigerianCurriculumTemplate).not.toHaveBeenCalled();
    expect(db.createSchoolBankAccount).not.toHaveBeenCalled();
  });
});
