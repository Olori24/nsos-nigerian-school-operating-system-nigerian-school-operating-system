import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const workspace = readFileSync(new URL("../client/src/components/AiTutorWorkspace.tsx", import.meta.url), "utf8");
const db = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

describe("AI Tutor usage envelope", () => {
  it("shows aggregate request volume without inventing monetary AI cost or retaining conversations", () => {
    expect(workspace).toContain("AI usage envelope");
    expect(workspace).toContain("This is not a token, provider-invoice, or currency-cost estimate.");
    expect(workspace).toContain("this aggregate does not create a financial charge, forecast spend, or change a tutor automatically.");
    expect(db).toContain("questionsLast30Days");
    expect(db).toContain("This is a tenant aggregate usage envelope, not a token, provider invoice, or currency-cost estimate. Learner conversations are not retained.");
  });
});
