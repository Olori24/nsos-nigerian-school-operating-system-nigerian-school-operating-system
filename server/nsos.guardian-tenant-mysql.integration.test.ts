import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb, linkGuardianToStudent } from "./db";
import { guardians, schools, studentGuardians, studentProfiles } from "../drizzle/schema/core";

const integrationEnabled = process.env.NSOS_MYSQL_INTEGRATION === "1";

describe.skipIf(!integrationEnabled)("guardian tenant isolation (MySQL integration)", () => {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 20);
  let schoolAId = 0;
  let schoolBId = 0;
  let studentBId = 0;

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    try {
      if (studentBId) {
        await db.delete(studentGuardians).where(eq(studentGuardians.studentId, studentBId));
      }
      if (schoolAId) await db.delete(guardians).where(eq(guardians.schoolId, schoolAId));
      if (schoolBId) await db.delete(guardians).where(eq(guardians.schoolId, schoolBId));
      if (schoolBId) await db.delete(studentProfiles).where(eq(studentProfiles.schoolId, schoolBId));
      if (schoolAId) await db.delete(schools).where(eq(schools.id, schoolAId));
      if (schoolBId) await db.delete(schools).where(eq(schools.id, schoolBId));
    } finally {
      await db.$client.end();
    }
  });

  it("rejects a cross-school link without inserting a guardian or relationship", async () => {
    const db = await getDb();
    if (!db) throw new Error("MySQL integration database is unavailable.");

    const schoolA = await db.insert(schools).values({
      name: "Tenant Isolation Test School A",
      shortCode: `TSTA-${suffix}`,
      createdBy: 1,
    });
    schoolAId = Number(schoolA[0].insertId);

    const schoolB = await db.insert(schools).values({
      name: "Tenant Isolation Test School B",
      shortCode: `TSTB-${suffix}`,
      createdBy: 1,
    });
    schoolBId = Number(schoolB[0].insertId);

    const student = await db.insert(studentProfiles).values({
      schoolId: schoolBId,
      admissionNo: `TENANT-${suffix}`,
      firstName: "Synthetic",
      lastName: "Learner",
    });
    studentBId = Number(student[0].insertId);

    await expect(
      linkGuardianToStudent({
        schoolId: schoolAId,
        studentId: studentBId,
        firstName: "Synthetic",
        lastName: "Guardian",
        relationship: "Parent",
      }),
    ).rejects.toThrow("Student record was not found in this school.");

    expect(await db.select({ id: guardians.id }).from(guardians).where(eq(guardians.schoolId, schoolAId))).toHaveLength(0);
    expect(await db.select({ id: guardians.id }).from(guardians).where(eq(guardians.schoolId, schoolBId))).toHaveLength(0);
    expect(await db.select({ id: studentGuardians.id }).from(studentGuardians).where(eq(studentGuardians.studentId, studentBId))).toHaveLength(0);

    // Reserve the next guardian ID in a pre-existing relationship row. The
    // guardian insert can succeed, but the relationship insert then collides
    // with the unique (studentId, guardianId) index and must roll back.
    const sequenceConnection = await db.$client.promise().getConnection();
    let nextGuardianId: number;
    try {
      await sequenceConnection.query("SET SESSION information_schema_stats_expiry = 0");
      const [sequenceRows] = await sequenceConnection.query(
        "SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'guardians'",
      );
      nextGuardianId = Number(
        (sequenceRows as Array<{ AUTO_INCREMENT: number | null }>)[0]?.AUTO_INCREMENT,
      );
    } finally {
      sequenceConnection.release();
    }
    if (!Number.isSafeInteger(nextGuardianId) || nextGuardianId <= 0) {
      throw new Error("Could not determine the next guardian ID for rollback coverage.");
    }
    await db.insert(studentGuardians).values({
      studentId: studentBId,
      guardianId: nextGuardianId,
    });
    try {
      await expect(linkGuardianToStudent({
        schoolId: schoolBId,
        studentId: studentBId,
        firstName: "Synthetic",
        lastName: "Rollback Guardian",
        relationship: "Parent",
      })).rejects.toThrow();
      expect(await db.select({ id: guardians.id }).from(guardians).where(eq(guardians.schoolId, schoolBId))).toHaveLength(0);
      expect(await db.select({ id: studentGuardians.id }).from(studentGuardians).where(eq(studentGuardians.studentId, studentBId))).toHaveLength(1);
    } finally {
      await db.delete(studentGuardians).where(eq(studentGuardians.studentId, studentBId));
    }

    const validLink = await linkGuardianToStudent({
      schoolId: schoolBId,
      studentId: studentBId,
      firstName: "Synthetic",
      lastName: "Guardian",
      relationship: "Parent",
    });

    expect(validLink.guardianId).toBeGreaterThan(0);
    expect(await db.select({ id: studentGuardians.id }).from(studentGuardians).where(eq(studentGuardians.studentId, studentBId))).toHaveLength(1);
  });
});
