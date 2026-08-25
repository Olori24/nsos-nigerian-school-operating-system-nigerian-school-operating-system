import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const enrollmentStation = readFileSync(new URL("../client/src/components/EnrollmentStation.tsx", import.meta.url), "utf8");
const dbSource = readFileSync(new URL("./db/core.ts", import.meta.url), "utf8");

describe("admissions enrollment biodata and letter wiring", () => {
  it("explains the confirmed-enrollment letter trigger to school staff", () => {
    expect(enrollmentStation).toContain("Accepted applicant to enrolled learner");
    expect(enrollmentStation).toContain("Review enrollment details");
    expect(enrollmentStation).toContain("Final enrollment confirmation");
    expect(enrollmentStation).toContain("Confirm enrollment");
    expect(enrollmentStation).toContain("confirmed: true");
    expect(enrollmentStation).toContain("does not collect or record payment");
    expect(enrollmentStation).toContain("Enrollment complete");
    expect(enrollmentStation).toContain("View student profile");
    expect(enrollmentStation).toContain("View enrollment record");
    expect(enrollmentStation).toContain("trpc.nsos.students.record.useQuery");
    expect(enrollmentStation).toContain("RecordViewSkeleton");
    expect(enrollmentStation).toContain('aria-busy="true"');
    expect(enrollmentStation).toContain("animate-pulse motion-reduce:animate-none");
    expect(enrollmentStation).toContain("Loading the protected");
    expect(enrollmentStation).toContain("Accepted applicant to enrolled learner");
    expect(enrollmentStation).toContain("not_sent_no_guardian_email");
    expect(enrollmentStation).toContain("guardian record was created and linked");
  });

  it("maps approved admission biodata into the student profile rather than discarding it", () => {
    expect(dbSource).toContain("middleName: supplement.middleName?.trim() || null");
    expect(dbSource).toContain("address: supplement.residentialAddress?.trim() || null");
    expect(dbSource).toContain("medicalNotes: supplement.medicalHistory?.trim() || null");
    expect(dbSource).toContain("stateOfOrigin");
    expect(dbSource).toContain("localGovernment");
    expect(dbSource).toContain("eq(guardians.schoolId, input.schoolId)");
    expect(dbSource).toContain("await db.insert(studentGuardians).values({ studentId, guardianId, isPrimary: true })");
    expect(dbSource).toContain("relationship: \"Parent/Guardian\"");
    expect(dbSource).toContain("getStudentEnrollmentRecord");
    expect(dbSource).toContain("eq(studentProfiles.schoolId, schoolId)");
  });
});
