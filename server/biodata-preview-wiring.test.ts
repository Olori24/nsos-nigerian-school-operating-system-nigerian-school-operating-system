import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const publicAdmissions = readFileSync(
  resolve(projectRoot, "client/src/pages/PublicAdmissions.tsx"),
  "utf8"
);
const home = readFileSync(
  resolve(projectRoot, "client/src/pages/Home.tsx"),
  "utf8"
).replace(/\s+/g, " ");

describe("biodata PDF preview integration wiring", () => {
  it("passes approved public-school branding and submit-ready completion time into the public preview", () => {
    expect(publicAdmissions).toMatch(
      /useFormCompletionTimestamp\(\s*isAdmissionBiodataReady\(\s*form,\s*completionTemplate\.requireDeclaration,\s*declarationAccepted\s*\)\s*\)/
    );
    expect(publicAdmissions).toMatch(
      /biodataPdfHeaderDefaults\(\s*\{\s*organizationName:\s*school\.data\.name/
    );
    expect(publicAdmissions).toContain(
      "logoUrl: template.headerLogoUrl ?? undefined"
    );
    expect(publicAdmissions).toContain(
      "completionTimestamp={completionTimestamp}"
    );
  });

  it("passes active-school branding and submit-ready completion time into internal admission and student previews", () => {
    expect(home).toMatch(
      /useFormCompletionTimestamp\(\s*isAdmissionBiodataReady\(form\)\s*\)/
    );
    expect(home).toMatch(
      /useFormCompletionTimestamp\(\s*isStudentBiodataReady\(form\)\s*\)/
    );
    expect(home).toContain(
      "biodataPdfHeaderDefaults({ organizationName: schoolName"
    );
    expect((home.match(/defaultHeader=\{defaultHeader\}/g) ?? []).length).toBe(
      2
    );
    expect(
      (home.match(/completionTimestamp=\{completionTimestamp\}/g) ?? []).length
    ).toBe(2);
  });
});
