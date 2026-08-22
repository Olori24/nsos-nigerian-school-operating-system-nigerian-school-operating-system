import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseAcademicMigrationText } from "../client/src/components/AcademicMigrationWorkspace";

const panel = readFileSync(resolve(import.meta.dirname, "../client/src/components/AcademicMigrationWorkspace.tsx"), "utf8");

describe("Academic migration interface", () => {
  it("parses class and subject rows without inventing academic data", () => {
    expect(parseAcademicMigrationText("kind,name,code\nclass,Primary 1,\nsubject,Mathematics,MAT")).toEqual({ rows: [{ sourceRow: 2, kind: "class", name: "Primary 1", code: undefined }, { sourceRow: 3, kind: "subject", name: "Mathematics", code: "MAT" }] });
    expect(parseAcademicMigrationText("kind\tname\tcode\nsubject\tEnglish Language\tENG").rows[0]).toMatchObject({ kind: "subject", code: "ENG" });
  });

  it("requires core headers and visibly preserves local review and non-overwrite controls", () => {
    expect(parseAcademicMigrationText("name,code\nMathematics,MAT").error).toContain("kind");
    expect(panel).toContain("Choose local CSV or TSV");
    expect(panel).toContain("Validate academic rows");
    expect(panel).toContain("Confirm and import academics");
    expect(panel).toContain("will not overwrite existing curriculum records");
  });
});
