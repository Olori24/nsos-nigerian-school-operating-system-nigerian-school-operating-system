import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const operator = readFileSync(new URL("../client/src/components/SchoolOperator.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const db = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

describe("School Operator interface", () => {
  it("makes School Operator owner/admin-only and available in the command center navigation", () => {
    expect(home).toContain('"school-operator"');
    expect(home).toContain('label: "School Operator"');
    expect(home).toContain('role === "owner" || role === "admin" ? <SchoolOperator');
  });

  it("requires explicit refresh and memory confirmation while showing no-autonomous-action boundaries", () => {
    expect(operator).toContain("I understand this refresh creates or updates private, explainable insight records only. It does not take action.");
    expect(operator).toContain("Refresh private insights");
    expect(operator).toContain("I confirm this is institution-approved planning context.");
    expect(operator).toContain("Save private operating memory");
    expect(operator).toContain("never predicts individual outcomes, sends messages, changes records, or runs a consequential action");
    expect(operator).toContain("no grades, certificates, prices, people, payments, provider changes, messages, domains, or public content are changed here");
  });

  it("exposes explainable evidence, protected handoffs, and local dismissal rather than hidden automation", () => {
    expect(operator).toContain("Evidence:");
    expect(operator).toContain("Review in the protected workspace");
    expect(operator).toContain("dismiss.mutate({ schoolId, insightId: insight.id, confirmed: true })");
    expect(operator).toContain("Current limits");
  });

  it("keeps learning-evidence intelligence aggregate-only and review-first", () => {
    expect(db).toContain("milestone-evidence-awaiting-review");
    expect(db).toContain("milestone-evidence-returned");
    expect(db).toContain("Open Learning Centre to review only the records you are authorised to access.");
    expect(db).toContain("NSOS does not automatically contact, grade, or complete learners.");
    expect(db).toContain("submitted_milestone_evidence");
    expect(db).toContain("returned_milestone_evidence");
  });
});
