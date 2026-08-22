import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ getSchoolMembership: vi.fn(), previewStaffMigration: vi.fn(), importStaffMigration: vi.fn(), listStaffMigrationBatches: vi.fn(), consumeSharedRateLimit: vi.fn(), recordSecurityAuditEvent: vi.fn() }));
vi.mock("./db", () => db);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const row = { sourceRow: 2, employeeNo: "GFA-ST-001", firstName: "Amina", lastName: "Yusuf", jobTitle: "Class Teacher", employmentType: "full_time", email: "amina@example.ng" };
const user = { id: 73, openId: "staff-migration-owner", name: "Staff Migration Owner", email: "owner@example.ng", loginMethod: "email" as const, role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const caller = () => appRouter.createCaller({ user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("NSOS staff migration routes", () => {
  beforeEach(() => { vi.clearAllMocks(); db.getSchoolMembership.mockResolvedValue({ id: 1, schoolId: 8, userId: 73, role: "admin", status: "active" }); db.consumeSharedRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 }); db.recordSecurityAuditEvent.mockResolvedValue(undefined); });

  it("permits only management roles to review school-scoped staff rows", async () => {
    db.previewStaffMigration.mockResolvedValue({ rowCount: 1, readyCount: 1, errorCount: 0, rows: [{ ...row, errors: [] }] });
    await expect(caller().nsos.staff.migrationPreview({ schoolId: 8, rows: [row] })).resolves.toMatchObject({ readyCount: 1 });
    expect(db.previewStaffMigration).toHaveBeenCalledWith({ schoolId: 8, rows: [row] });
    db.getSchoolMembership.mockResolvedValue({ id: 2, schoolId: 8, userId: 73, role: "teacher", status: "active" });
    await expect(caller().nsos.staff.migrationPreview({ schoolId: 8, rows: [row] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires final confirmation and audits a completed import without account or invitation side effects", async () => {
    const input = { schoolId: 8, idempotencyKey: "d63bcd44-fdbf-47de-a0e7-77f37c68d5ca", rows: [row], confirmed: true as const };
    db.importStaffMigration.mockResolvedValue({ batchId: 21, status: "completed", staffCount: 1, idempotent: false });
    await expect(caller().nsos.staff.migrationImport(input)).resolves.toMatchObject({ batchId: 21, staffCount: 1 });
    expect(db.importStaffMigration).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 8, importedBy: 73 }));
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "staff_migration_completed", metadata: { staffCount: 1, idempotent: false, confirmationRequired: true, accountCreated: false, invitationSent: false } }));
    await expect(caller().nsos.staff.migrationImport({ ...input, confirmed: false as any })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
