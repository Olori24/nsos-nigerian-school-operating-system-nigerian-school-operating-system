import { describe, expect, it } from "vitest";
import { biodataPdfFilename, biodataPdfHeaderDefaults, completedBiodataFields, formatCompletionTimestamp, isHttpsLogoUrl } from "../client/src/lib/biodataPdf";
import { isAdmissionBiodataReady, isStudentBiodataReady } from "../client/src/lib/biodataCompletion";

describe("biodata preview export", () => {
  it("includes only completed values in the preview and PDF payload", () => {
    expect(completedBiodataFields([{ label: "First name", value: " Ada " }, { label: "State of origin", value: "" }, { label: "Guardian phone", value: undefined }])).toEqual([{ label: "First name", value: "Ada" }]);
  });

  it("creates a download-safe, Nigeria-first PDF filename", () => {
    expect(biodataPdfFilename("Greener Future Academy: Admission Biodata")).toMatch(/^greener-future-academy-admission-biodata-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it("accepts only an optional HTTPS header logo and records form completion time", () => {
    expect(isHttpsLogoUrl()).toBe(true);
    expect(isHttpsLogoUrl("https://school.example/logo.png")).toBe(true);
    expect(isHttpsLogoUrl("http://school.example/logo.png")).toBe(false);
    expect(isHttpsLogoUrl("not-a-url")).toBe(false);
    expect(formatCompletionTimestamp("2026-08-19T08:30:00.000Z")).toContain("2026");
  });

  it("uses the same safe school-branding defaults for public and internal exports", () => {
    expect(biodataPdfHeaderDefaults({ organizationName: "Greener Future Academy", tagline: "Learning for tomorrow", logoUrl: "https://school.example/logo.png" })).toEqual({ organizationName: "Greener Future Academy", tagline: "Learning for tomorrow", logoUrl: "https://school.example/logo.png" });
    expect(biodataPdfHeaderDefaults({ organizationName: "Greener Future Academy", logoUrl: "http://school.example/logo.png" })).toEqual({ organizationName: "Greener Future Academy", tagline: "NIGERIAN SCHOOL OPERATING SYSTEM", logoUrl: undefined });
  });

  it("unlocks completion timestamps only when public or internal required biodata is submit-ready", () => {
    const admission = { firstName: "Ada", lastName: "Okoro", guardianName: "Chidi Okoro", guardianPhone: "08031234567", guardianEmail: "guardian@example.ng" };
    expect(isAdmissionBiodataReady(admission, true, false)).toBe(false);
    expect(isAdmissionBiodataReady(admission, true, true)).toBe(true);
    expect(isAdmissionBiodataReady({ ...admission, guardianPhone: "12" })).toBe(false);
    const student = { firstName: "Ada", lastName: "Okoro", admissionNo: "GFA-001", classId: "4", sessionId: "2", admittedOn: "2026-08-19" };
    expect(isStudentBiodataReady(student)).toBe(true);
    expect(isStudentBiodataReady({ ...student, classId: "" })).toBe(false);
  });
});
