import { afterAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
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

    // Force the relationship insert to fail after the guardian insert. The
    // transaction must roll back the earlier guardian row as well.
    const triggerName = `nsos_fail_guardian_link_${suffix}`;
    await db.execute(sql.raw(`CREATE TRIGGER ${triggerName} BEFORE INSERT ON studentGuardians FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced relationship failure'`));
    try {
      await expect(linkGuardianToStudent({
        schoolId: schoolBId,
        studentId: studentBId,
        firstName: "Synthetic",
        lastName: "Rollback Guardian",
        relationship: "Parent",
      })).rejects.toThrow();
      expect(await db.select({ id: guardians.id }).from(guardians).where(eq(guardians.schoolId, schoolBId))).toHaveLength(0);
      expect(await db.select({ id: studentGuardians.id }).from(studentGuardians).where(eq(studentGuardians.studentId, studentBId))).toHaveLength(0);
    } finally {
      await db.execute(sql.raw(`DROP TRIGGER IF EXISTS ${triggerName}`));
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
