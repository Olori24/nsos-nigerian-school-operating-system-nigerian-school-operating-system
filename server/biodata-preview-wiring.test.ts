import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const publicAdmissions = readFileSync(resolve(projectRoot, "client/src/pages/PublicAdmissions.tsx"), "utf8");
const home = readFileSync(resolve(projectRoot, "client/src/pages/Home.tsx"), "utf8");

describe("biodata PDF preview integration wiring", () => {
  it("passes approved public-school branding and submit-ready completion time into the public preview", () => {
    expect(publicAdmissions).toContain("useFormCompletionTimestamp(isAdmissionBiodataReady(form, completionTemplate.requireDeclaration, declarationAccepted))");
    expect(publicAdmissions).toContain("biodataPdfHeaderDefaults({ organizationName: school.data.name");
    expect(publicAdmissions).toContain("logoUrl: template.headerLogoUrl ?? undefined");
    expect(publicAdmissions).toContain("completionTimestamp={completionTimestamp}");
  });

  it("passes active-school branding and submit-ready completion time into internal admission and student previews", () => {
    expect(home).toContain("useFormCompletionTimestamp(isAdmissionBiodataReady(form))");
    expect(home).toContain("useFormCompletionTimestamp(isStudentBiodataReady(form))");
    expect(home).toContain("biodataPdfHeaderDefaults({ organizationName: schoolName");
    expect((home.match(/defaultHeader=\{defaultHeader\}/g) ?? []).length).toBe(2);
    expect((home.match(/completionTimestamp=\{completionTimestamp\}/g) ?? []).length).toBe(2);
  });
});
