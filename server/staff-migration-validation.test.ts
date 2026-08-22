import { describe, expect, it } from "vitest";
import { normaliseStaffMigrationRows } from "./db";

describe("staff migration row validation", () => {
  it("flags duplicate employee and contact values before any profile is created", () => {
    const rows = normaliseStaffMigrationRows([{ sourceRow: 2, employeeNo: "GFA-ST-001", firstName: "Amina", lastName: "Yusuf", jobTitle: "Teacher", email: "amina@example.ng", phone: "08030000000" }, { sourceRow: 3, employeeNo: "gfa-st-001", firstName: "Bola", lastName: "Ade", jobTitle: "Teacher", email: "amina@example.ng", phone: "08030000000" }]);
    expect(rows[0].errors).toEqual([]);
    expect(rows[1].errors).toEqual(expect.arrayContaining(["Employee number duplicates row 2.", "Staff email duplicates row 2.", "Staff phone duplicates row 2."]));
  });

  it("flags malformed employment data instead of silently creating a profile", () => {
    const [row] = normaliseStaffMigrationRows([{ sourceRow: 2, employeeNo: "GFA-ST-002", firstName: "", lastName: "Ali", jobTitle: "", employmentType: "permanent", email: "not-an-email", joinedOn: "12/01/2026" }]);
    expect(row.errors).toEqual(expect.arrayContaining(["Staff first name is required.", "Job title is required.", "Employment type must be full_time, part_time, contract, or temporary.", "Staff email is not valid.", "Joined-on date must use YYYY-MM-DD."]));
  });
});
