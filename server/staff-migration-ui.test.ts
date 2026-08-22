import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseStaffMigrationText } from "../client/src/components/StaffMigrationWorkspace";

const panel = readFileSync(resolve(import.meta.dirname, "../client/src/components/StaffMigrationWorkspace.tsx"), "utf8");

describe("Staff migration interface", () => {
  it("parses approved CSV and TSV staff rows without inventing employment records", () => {
    expect(parseStaffMigrationText("employeeNo,firstName,lastName,jobTitle\nGFA-ST-001,Amina,Yusuf,Teacher")).toEqual({ rows: [{ sourceRow: 2, employeeNo: "GFA-ST-001", firstName: "Amina", lastName: "Yusuf", jobTitle: "Teacher" }] });
    expect(parseStaffMigrationText("employeeNo\tfirstName\tlastName\tjobTitle\nGFA-ST-002\tBola\tAde\tBursar").rows[0]).toMatchObject({ employeeNo: "GFA-ST-002", jobTitle: "Bursar" });
  });

  it("exposes local-file, validation, and explicit no-account confirmation controls", () => {
    expect(parseStaffMigrationText("firstName,lastName\nAmina,Yusuf").error).toContain("employeeNo");
    expect(panel).toContain("Choose local CSV or TSV");
    expect(panel).toContain("Raw files are not stored or sent to AI.");
    expect(panel).toContain("Validate staff rows");
    expect(panel).toContain("Confirm and import staff");
    expect(panel).toContain("will not create user accounts or send invitations");
  });
});
