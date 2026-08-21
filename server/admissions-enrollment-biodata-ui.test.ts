import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const enrollmentStation = readFileSync(new URL("../client/src/components/EnrollmentStation.tsx", import.meta.url), "utf8");
const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

describe("admissions enrollment biodata and letter wiring", () => {
  it("explains the confirmed-enrollment letter trigger to school staff", () => {
    expect(enrollmentStation).toContain("Enroll & send admission letter");
    expect(enrollmentStation).toContain("approved admission biodata");
    expect(enrollmentStation).toContain("not_sent_no_guardian_email");
  });

  it("maps approved admission biodata into the student profile rather than discarding it", () => {
    expect(dbSource).toContain("middleName: supplement.middleName?.trim() || null");
    expect(dbSource).toContain("address: supplement.residentialAddress?.trim() || null");
    expect(dbSource).toContain("medicalNotes: supplement.medicalHistory?.trim() || null");
    expect(dbSource).toContain("stateOfOrigin");
    expect(dbSource).toContain("localGovernment");
  });
});
