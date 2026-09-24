import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ getSchoolMembership: vi.fn(), previewAcademicMigration: vi.fn(), importAcademicMigration: vi.fn(), listAcademicMigrationBatches: vi.fn(), consumeSharedRateLimit: vi.fn(), recordSecurityAuditEvent: vi.fn() }));
vi.mock("./db", () => db);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const rows = [{ sourceRow: 2, kind: "class", name: "Primary 1", level: "Primary", arm: "A", capacity: "32" }, { sourceRow: 3, kind: "subject", name: "Mathematics", code: "MAT" }];
const user = { id: 64, openId: "academic-migration-owner", name: "Academic Migration Owner", email: "owner@example.ng", loginMethod: "email" as const, role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const caller = () => appRouter.createCaller({ user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("NSOS academic migration routes", () => {
  beforeEach(() => { vi.clearAllMocks(); db.getSchoolMembership.mockResolvedValue({ id: 1, schoolId: 6, userId: 64, role: "owner", status: "active" }); db.consumeSharedRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 }); db.recordSecurityAuditEvent.mockResolvedValue(undefined); });

  it("allows an owner to review academic rows only within the chosen school session", async () => {
    db.previewAcademicMigration.mockResolvedValue({ rowCount: 2, classCount: 1, subjectCount: 1, readyCount: 2, errorCount: 0, rows: [] });
    await expect(caller().nsos.academics.migrationPreview({ schoolId: 6, sessionId: 4, rows })).resolves.toMatchObject({ readyCount: 2 });
    expect(db.previewAcademicMigration).toHaveBeenCalledWith({ schoolId: 6, sessionId: 4, rows });
    db.getSchoolMembership.mockResolvedValue({ id: 2, schoolId: 6, userId: 64, role: "teacher", status: "active" });
    await expect(caller().nsos.academics.migrationPreview({ schoolId: 6, sessionId: 4, rows })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires final confirmation and stores safe import counts only", async () => {
    const input = { schoolId: 6, sessionId: 4, idempotencyKey: "c99e5098-bfb3-4b63-910e-989a5b394c72", rows, confirmed: true as const };
    db.importAcademicMigration.mockResolvedValue({ batchId: 25, status: "completed", classCount: 1, subjectCount: 1, idempotent: false });
    await expect(caller().nsos.academics.migrationImport(input)).resolves.toMatchObject({ batchId: 25 });
    expect(db.importAcademicMigration).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 6, sessionId: 4, importedBy: 64 }));
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "academic_migration_completed", metadata: { classCount: 1, subjectCount: 1, idempotent: false, confirmationRequired: true } }));
    await expect(caller().nsos.academics.migrationImport({ ...input, confirmed: false as any })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
