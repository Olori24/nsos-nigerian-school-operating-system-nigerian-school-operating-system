import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ getSchoolMembership: vi.fn(), previewStudentMigration: vi.fn(), importStudentMigration: vi.fn(), listStudentMigrationBatches: vi.fn(), consumeSharedRateLimit: vi.fn(), recordSecurityAuditEvent: vi.fn() }));
vi.mock("./db", () => db);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const row = { sourceRow: 2, admissionNo: "GFA-001", firstName: "Ada", lastName: "Okafor", guardianFirstName: "Ifeoma", guardianLastName: "Okafor", guardianRelationship: "Mother", guardianEmail: "ifeoma@example.ng" };
const user = { id: 92, openId: "migration-owner", name: "Migration Owner", email: "owner@example.ng", loginMethod: "email" as const, role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const caller = () => appRouter.createCaller({ user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("NSOS student migration routes", () => {
  beforeEach(() => { vi.clearAllMocks(); db.getSchoolMembership.mockResolvedValue({ id: 1, schoolId: 7, userId: 92, role: "owner", status: "active" }); db.consumeSharedRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 }); db.recordSecurityAuditEvent.mockResolvedValue(undefined); });

  it("allows an owner to review only school-scoped migration rows", async () => {
    db.previewStudentMigration.mockResolvedValue({ rowCount: 1, readyCount: 1, errorCount: 0, rows: [{ sourceRow: 2, admissionNo: "GFA-001", firstName: "Ada", lastName: "Okafor", errors: [] }] });
    await expect(caller().nsos.students.migrationPreview({ schoolId: 7, classId: 3, sessionId: 4, rows: [row] })).resolves.toMatchObject({ readyCount: 1 });
    expect(db.previewStudentMigration).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 7, classId: 3, sessionId: 4 }));
    db.getSchoolMembership.mockResolvedValue({ id: 2, schoolId: 7, userId: 92, role: "teacher", status: "active" });
    await expect(caller().nsos.students.migrationPreview({ schoolId: 7, classId: 3, sessionId: 4, rows: [row] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires final confirmation before import and records a successful approved batch without raw student data", async () => {
    const input = { schoolId: 7, classId: 3, sessionId: 4, admittedOn: "2026-09-01", idempotencyKey: "a6cb679d-d5f6-494d-873d-938217dca7d7", rows: [row], confirmed: true as const };
    db.importStudentMigration.mockResolvedValue({ batchId: 14, status: "completed", studentCount: 1, guardianCount: 1, idempotent: false });
    await expect(caller().nsos.students.migrationImport(input)).resolves.toMatchObject({ batchId: 14, studentCount: 1 });
    expect(db.importStudentMigration).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 7, importedBy: 92, idempotencyKey: input.idempotencyKey }));
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "student_migration_completed", metadata: { studentCount: 1, guardianCount: 1, idempotent: false, confirmationRequired: true } }));
    await expect(caller().nsos.students.migrationImport({ ...input, confirmed: false as any })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.importStudentMigration).toHaveBeenCalledTimes(1);
  });

  it("lists completed migration batches only through the owner-admin migration gate", async () => {
    db.listStudentMigrationBatches.mockResolvedValue([{ id: 14, studentCount: 1, guardianCount: 1, status: "completed" }]);
    await expect(caller().nsos.students.migrationHistory({ schoolId: 7 })).resolves.toHaveLength(1);
    expect(db.listStudentMigrationBatches).toHaveBeenCalledWith(7);
  });
});
