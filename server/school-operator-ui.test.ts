import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const operator = readFileSync(
  new URL("../client/src/components/SchoolOperator.tsx", import.meta.url),
  "utf8"
);
const operatorText = operator.replace(/\s+/g, " ");
const home = readFileSync(
  new URL("../client/src/pages/Home.tsx", import.meta.url),
  "utf8"
);
const db = readFileSync(new URL("./db/core.ts", import.meta.url), "utf8");

describe("School Operator interface", () => {
  it("surfaces a concise owner morning brief from current operational records", () => {
    expect(operatorText).toContain("Owner Morning Brief");
    expect(operatorText).toContain("Start with what matters today.");
    expect(operatorText).toContain("surfaced");
    expect(operatorText).toContain(
      "A short action list built from the school's current records."
    );
    expect(operatorText).toContain("No immediate exception surfaced.");
  });

  it("makes School Operator owner/admin-only and available in the command center navigation", () => {
    expect(home).toContain('"school-operator"');
    expect(home).toContain('label: "School Operator"');
    expect(home).toContain(
      'role === "owner" || role === "admin" ? <SchoolOperator'
    );
  });

  it("requires explicit refresh and memory confirmation while showing no-autonomous-action boundaries", () => {
    expect(operatorText).toContain(
      "I understand this refresh creates or updates private, explainable insight records only. It does not take action."
    );
    expect(operatorText).toContain("Refresh private insights");
    expect(operatorText).toContain(
      "I confirm this is institution-approved planning context."
    );
    expect(operatorText).toContain("Save private operating memory");
    expect(operatorText).toContain(
      "never predicts individual outcomes, sends messages, changes records, or runs a consequential action"
    );
    expect(operatorText).toContain(
      "no grades, certificates, prices, people, payments, provider changes, messages, domains, or public content are changed here"
    );
  });

  it("provides a confirmed owner review-preference panel without scheduling or bypassing protected actions", () => {
    expect(operatorText).toContain("Approval-first workflow preferences");
    expect(operatorText).toContain(
      "A review cue is a planning preference only."
    );
    expect(operatorText).toContain(
      "does not schedule, monitor, refresh, message, retry, or execute work in the background"
    );
    expect(operatorText).toContain(
      "They cannot approve, publish, send, charge, enrol, grade, complete, certify, or change provider or domain settings."
    );
    expect(operatorText).toMatch(
      /saveWorkflowPreferences\.mutate\(\{ schoolId, preferences: workflowPreferences, confirmed: true,? \}\)/
    );
    expect(operatorText).toContain("Save workflow preferences");
    expect(operatorText).toContain("Also show locally dismissed insights");
    expect(db).toContain("operatorWorkflowPreferenceDefault");
    expect(db).toContain(
      "Workflow preferences only shape this private review experience; they cannot remove confirmation gates, role checks, rate limits, or action boundaries."
    );
  });

  it("makes owner authority and the absence of unattended autopilot visible in the operating workspace", () => {
    expect(operatorText).toContain("Owner authority stays on");
    expect(operatorText).toContain(
      "Your protected review remains required for every consequential action."
    );
    expect(operatorText).toContain(
      "A human remains responsible for assessment, grades, results, completion, and credentials."
    );
    expect(operatorText).toContain(
      "Publication, messages, campaigns, spend, fees, payments, admissions, enrolment, providers, and domains stay in separately confirmed workspaces."
    );
    expect(operatorText).toContain("No unattended autopilot");
    expect(operatorText).toContain(
      "does not run background loops, automatic retries, or triggered consequential work from School Operator."
    );
  });

  it("exposes explainable evidence, protected handoffs, and local dismissal rather than hidden automation", () => {
    expect(operatorText).toContain("Evidence:");
    expect(operatorText).toContain("Review in the protected workspace");
    expect(operatorText).toMatch(
      /dismiss\.mutate\(\{ schoolId, insightId: insight\.id, confirmed: true,? \}\)/
    );
    expect(operatorText).toContain("Current limits");
  });

  it("shows deterministic academy launch readiness without treating configuration evidence as a public launch decision", () => {
    expect(operatorText).toContain("Academy Launch Readiness");
    expect(operatorText).toContain(
      "This deterministic checklist reads current tenant configuration evidence only."
    );
    expect(operatorText).toContain(
      "It does not publish, activate a course, send a message, charge, enroll, issue a credential, or approve a launch."
    );
    expect(operatorText).toContain(
      "A status of READY means only that the named configuration evidence is present."
    );
    expect(db).toContain("deriveAcademyLaunchReadiness");
    expect(db).toContain("staging-and-recovery");
  });

  it("keeps learning-evidence intelligence aggregate-only and review-first", () => {
    expect(db).toContain("milestone-evidence-awaiting-review");
    expect(db).toContain("milestone-evidence-returned");
    expect(db).toContain(
      "Open Learning Centre to review only the records you are authorised to access."
    );
    expect(db).toContain(
      "NSOS does not automatically contact, grade, or complete learners."
    );
    expect(db).toContain("submitted_milestone_evidence");
    expect(db).toContain("returned_milestone_evidence");
  });
});
