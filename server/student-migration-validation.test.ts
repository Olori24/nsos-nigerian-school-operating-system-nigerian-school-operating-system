import { describe, expect, it } from "vitest";
import { normaliseStudentMigrationRows } from "./db";

describe("student migration row validation", () => {
  it("flags duplicate admission numbers and leaves valid rows reviewable without writing records", () => {
    const rows = normaliseStudentMigrationRows([{ sourceRow: 2, admissionNo: "GFA-001", firstName: "Ada", lastName: "Okafor" }, { sourceRow: 3, admissionNo: "gfa-001", firstName: "Musa", lastName: "Bello" }]);
    expect(rows[0].errors).toEqual([]);
    expect(rows[1].admissionNo).toBe("GFA-001");
    expect(rows[1].errors).toContain("Admission number duplicates row 2.");
  });

  it("flags malformed dates, unapproved gender values, and incomplete guardian data before import", () => {
    const [row] = normaliseStudentMigrationRows([{ sourceRow: 2, admissionNo: "GFA-002", firstName: "Zainab", lastName: "Ali", dateOfBirth: "02/12/2017", gender: "unknown", guardianFirstName: "Khadija", guardianEmail: "not-an-email" }]);
    expect(row.errors).toEqual(expect.arrayContaining(["Date of birth must use YYYY-MM-DD.", "Gender must be female, male, other, or prefer_not_to_say.", "Guardian email is not valid.", "A guardian requires first name, last name, and relationship."]));
  });
});
