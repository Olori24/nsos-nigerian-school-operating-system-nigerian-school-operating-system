import { describe, expect, it } from "vitest";
import { getNigerianCurriculumTemplate, listNigerianCurriculumTemplates } from "./nigerianCurriculum";

describe("Nigerian curriculum templates", () => {
  it("exposes editable NERDC-aligned basic and senior templates with traceable sources", () => {
    const templates = listNigerianCurriculumTemplates();
    expect(templates.map(template => template.id)).toEqual(["basic_primary", "basic_junior_secondary", "senior_secondary_review"]);
    expect(templates.every(template => template.sourceUrl.startsWith("https://www.nerdc.gov.ng/"))).toBe(true);
    expect(getNigerianCurriculumTemplate("basic_primary").subjects.map(subject => subject.name)).toContain("English Studies");
  });

  it("keeps senior-secondary electives reviewable rather than treating every optional subject as compulsory", () => {
    const senior = getNigerianCurriculumTemplate("senior_secondary_review");
    expect(senior.subjects.some(subject => subject.optional)).toBe(true);
    expect(senior.reviewNote).toMatch(/Review every item/i);
  });
});
