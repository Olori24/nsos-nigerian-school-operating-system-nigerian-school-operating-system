import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(root, "client/src/components/SchemeOfWorkImporter.tsx"), "utf8");

describe("scheme-of-work import readiness guidance", () => {
  it("explains empty class, term, and class-subject selectors rather than presenting unusable dropdowns", () => {
    expect(source).toContain("Pre-import readiness");
    expect(source).toContain("Create a class first");
    expect(source).toContain("Create a term first");
    expect(source).toContain("Apply curriculum to this class first");
  });

  it("keeps file selection and import unavailable until the approved class-subject and teacher prerequisites are complete", () => {
    expect(source).toContain("const importReady = Boolean(classId && subjectId && termId && selectedClassSubject?.teacherId)");
    expect(source).toContain("The upload unlocks after the required setup steps above are complete.");
    expect(source).toContain("disabled={parsing || !importReady}");
    expect(source).toContain("disabled={!file || !rows.length || !importReady");
  });

  it("keeps the assigned reviewing teacher as an explicit final gate before a scheme can be imported", () => {
    expect(source).toContain("Assign an active reviewing teacher");
    expect(source).toContain("Make at least one staff teacher active");
    expect(source).toContain("No active teacher is available yet.");
    expect(source).toContain("Add an active staff teacher first");
    expect(source).toContain("Assign reviewer");
  });
});
