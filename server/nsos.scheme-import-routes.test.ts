import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, getSchoolMembership: vi.fn(), importApprovedSchemeOfWork: vi.fn() };
});

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function caller() {
  return appRouter.createCaller({ user: { id: 62, openId: "scheme-owner", name: "Scheme Owner", email: "owner@example.com", loginMethod: "email", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

const adminMembership = { id: 1, schoolId: 7, userId: 62, role: "admin", status: "active", createdAt: new Date(), updatedAt: new Date() } as const;
const input = { schoolId: 7, classId: 11, subjectId: 12, termId: 13, fileName: "first-term.csv", mimeType: "text/csv" as const, base64: "YQ==YQ==YQ==", rows: [{ weekNo: 1, topic: "Welcome", objectives: "Introduce the term" }], replaceExisting: false };

describe("NSOS approved scheme-of-work import route", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(db.getSchoolMembership).mockResolvedValue(adminMembership as any); });

  it("routes a reviewed owner/admin import to the tenant-scoped import service", async () => {
    vi.mocked(db.importApprovedSchemeOfWork).mockResolvedValue({ importId: 20, rowCount: 1, fileName: "first-term.csv", replacedExisting: false });
    await expect(caller().nsos.academics.importSchemeOfWork(input)).resolves.toMatchObject({ rowCount: 1 });
    expect(db.importApprovedSchemeOfWork).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 7, importedBy: 62, classId: 11, rows: input.rows }));
  });

  it("rejects import requests from a teacher role before any scheme file is stored", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ ...adminMembership, role: "teacher" } as any);
    await expect(caller().nsos.academics.importSchemeOfWork(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.importApprovedSchemeOfWork).not.toHaveBeenCalled();
  });
});
