import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const hub = readFileSync(resolve(root, "client/src/components/StudentAiTutorHub.tsx"), "utf8");

describe("Student Learning Copilot interface", () => {
  it("keeps learner assistance scoped to approved learning support and teacher escalation", () => {
    expect(hub).toContain("Student Learning Copilot");
    expect(hub).toContain("Ask for help with an approved learning topic.");
    expect(hub).toContain("suggest practice steps");
    expect(hub).toContain("Request teacher support");
  });

  it("states that the assistant cannot complete assessed work, decide results, or grade learners", () => {
    expect(hub).toContain("does not complete assessed work, decide a result, grade your work, or replace human judgment");
    expect(hub).toContain("For personal, health, safety, welfare, assessment, or disciplinary matters");
  });
});
