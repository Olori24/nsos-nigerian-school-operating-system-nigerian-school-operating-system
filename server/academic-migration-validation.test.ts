import { describe, expect, it } from "vitest";
import { normaliseAcademicMigrationRows } from "./db";

describe("academic migration row validation", () => {
  it("flags duplicate class names and subject codes before existing curriculum can be touched", () => {
    const rows = normaliseAcademicMigrationRows([{ sourceRow: 2, kind: "class", name: "Primary 1" }, { sourceRow: 3, kind: "class", name: "primary 1" }, { sourceRow: 4, kind: "subject", name: "Mathematics", code: "MAT" }, { sourceRow: 5, kind: "subject", name: "Further Mathematics", code: "mat" }]);
    expect(rows[1].errors).toContain("Class name duplicates row 2.");
    expect(rows[3].errors).toContain("Subject code duplicates row 4.");
  });

  it("flags unsupported row kinds, subject codes, and invalid class capacity", () => {
    const rows = normaliseAcademicMigrationRows([{ sourceRow: 2, kind: "programme", name: "Primary 1" }, { sourceRow: 3, kind: "subject", name: "English" }, { sourceRow: 4, kind: "class", name: "JSS 1", capacity: "many" }]);
    expect(rows[0].errors).toContain("Kind must be class or subject.");
    expect(rows[1].errors).toContain("Subject code is required.");
    expect(rows[2].errors).toContain("Class capacity must be a whole number between 1 and 5000.");
  });
});
