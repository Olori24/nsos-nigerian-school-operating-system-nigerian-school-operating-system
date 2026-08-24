import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

describe("README approval-first School Operator release documentation", () => {
  it("links the operating model and documents explainable aggregate insight boundaries", () => {
    expect(readme).toContain("[AI School Operator](docs/ai-school-operator-operating-model.md)");
    expect(readme).toContain("tenant-scoped operating readiness");
    expect(readme).toContain("deterministic server-side aggregation supplies School Operator signals");
    expect(readme).toContain("does not use background loops, timers, or unreviewed external activity");
  });

  it("describes learner-owned next-step guidance without overstating academic or operational authority", () => {
    expect(readme).toContain("Student Learning Copilot");
    expect(readme).toContain("only on their own linked active programme context");
    expect(readme).toContain("never changes a programme, progress, assessment, result, completion state, or private issuer record");
    expect(readme).toContain("or change providers, domains, or DNS");
  });

  it("records the latest validation count and the unchanged external sender dependency", () => {
    expect(readme).toContain("399/400 passing tests across 109/110 files");
    expect(readme).toContain("currently unverified `resend.dev` sender");
    expect(readme).toContain("`nsos.top` is active at its registrar but is not bound to the managed deployment");
  });

  it("documents the latest Institution Builder recovery and private brand/growth foundation without overstating side effects", () => {
    expect(readme).toContain("typed transport rejects document responses before they reach the JSON parser");
    expect(readme).toContain("A transport failure does not create, apply, publish, or audit a blueprint.");
    expect(readme).toContain("private original-brand/logo concept, private offer/growth foundation");
    expect(readme).toContain("Create or license a brand asset");
    expect(readme).toContain("price/lead/campaign/testimonial/referral");
    expect(readme).toContain("Approval-first delivery contract");
  });

  it("documents the review-only Course Studio material expansion and visible owner authority policy", () => {
    expect(readme).toContain("plain-language lesson guide, non-graded knowledge check");
    expect(readme).toContain("calculate a score, grade, pass/fail result, progress change, completion, credential");
    expect(readme).toContain("visible owner-authority policy");
    expect(readme).toContain("Migration `0062_unknown_radioactive_man` was reviewed and applied");
  });

  it("documents the private Knowledge-to-Business release and its source, deletion, and no-action boundaries", () => {
    expect(readme).toContain("Knowledge-to-Business Engine");
    expect(readme).toContain("docs/knowledge-to-business-engine-contract.md");
    expect(readme).toContain("raw text out of audit metadata");
    expect(readme).toContain("Owners can inspect or confirmed-delete stored source text and analyses");
    expect(readme).toContain("does not infer individual ability, readiness, risk, eligibility, or career prospects");
    expect(readme).toContain("0062_unknown_radioactive_man");
  });
});
