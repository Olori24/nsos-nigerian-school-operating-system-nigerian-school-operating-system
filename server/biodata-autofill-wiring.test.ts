import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const publicAdmissions = readFileSync(resolve(projectRoot, "client/src/pages/PublicAdmissions.tsx"), "utf8");
const home = readFileSync(resolve(projectRoot, "client/src/pages/Home.tsx"), "utf8");
const app = readFileSync(resolve(projectRoot, "client/src/App.tsx"), "utf8");
const autoFill = readFileSync(resolve(projectRoot, "client/src/components/BiodataDocumentAutofill.tsx"), "utf8");
const aiCue = readFileSync(resolve(projectRoot, "client/src/components/AiAppliedFieldCue.tsx"), "utf8");
const server = readFileSync(resolve(projectRoot, "server/_core/index.ts"), "utf8");

describe("biodata document auto-fill integration wiring", () => {
  it("uses reviewed auto-fill suggestions in public admissions without changing the submit flow", () => {
    expect(publicAdmissions).toContain("BiodataDocumentAutofill");
    expect(autoFill).toContain("Apply selected suggestions");
    expect(publicAdmissions).toContain("onApply={values =>");
    expect(publicAdmissions).toContain("setAiAppliedFields(suggestedFieldKeys(values))");
    expect(publicAdmissions).toContain("AiAppliedFieldProvider");
    expect(publicAdmissions).toContain("submit.mutate({ shortCode, ...form");
  });

  it("targets only the currently open internal admission or student form and bounds the extraction endpoint", () => {
    expect(app).toContain("InternalBiodataAutofillLauncher");
    expect(app).toContain("nsos:biodata-autofill-apply");
    expect(home).toContain('target: "admission"');
    expect(home).toContain('target: "student"');
    expect(home).toContain("setAiAppliedFields(suggestedFieldKeys(values))");
    expect(home).toContain("AiAppliedFieldProvider");
    expect(aiCue).toContain("AI added — review");
    expect(home).toContain("setForm(current =>");
    expect(server).toContain('namespace: "biodata-document-extraction"');
    expect(server).toContain('limit: 8');
  });
});
