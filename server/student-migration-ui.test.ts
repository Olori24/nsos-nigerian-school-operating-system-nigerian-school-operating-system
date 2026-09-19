import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseStudentMigrationText } from "../client/src/components/StudentMigrationWorkspace";

const root = resolve(import.meta.dirname, "..");
const panel = readFileSync(
  resolve(root, "client/src/components/StudentMigrationWorkspace.tsx"),
  "utf8"
);

describe("Student migration interface", () => {
  it("parses CSV and tab-separated school rows without inventing records", () => {
    expect(
      parseStudentMigrationText(
        "admissionNo,firstName,lastName\nGFA-001,Ada,Okafor"
      )
    ).toEqual({
      rows: [
        {
          sourceRow: 2,
          admissionNo: "GFA-001",
          firstName: "Ada",
          lastName: "Okafor",
        },
      ],
    });
    expect(
      parseStudentMigrationText(
        "admissionNo\tfirstName\tlastName\nGFA-002\tMusa\tBello"
      ).rows[0]
    ).toMatchObject({
      admissionNo: "GFA-002",
      firstName: "Musa",
      lastName: "Bello",
    });
  });

  it("requires headers and visibly preserves review-first confirmation controls", () => {
    expect(
      parseStudentMigrationText("firstName,lastName\nAda,Okafor").error
    ).toContain("admissionNo");
    expect(panel).toMatch(
      /source data is not\s+sent to an AI\s+or stored as a raw file/
    );
    expect(panel).toContain("Validate migration rows");
    expect(panel).toContain("Confirm and import records");
    expect(panel).toContain("I confirm these are school-approved records.");
    expect(panel).toContain("Choose local CSV or TSV");
    expect(panel).toContain("It has not been uploaded or stored.");
    expect(panel).toContain("Excel workbooks should first be saved as CSV.");
    expect(panel).toContain(
      "No class choices are configured for this school yet."
    );
    expect(panel).toContain("Open Classes setup");
    expect(panel).toContain("No classes configured");
    expect(panel).toContain("onOpenClassSetup");
  });
});
