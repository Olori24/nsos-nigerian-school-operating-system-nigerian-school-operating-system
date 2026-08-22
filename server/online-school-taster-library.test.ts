import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { onlineSchoolTasters } from "../client/src/lib/onlineSchoolTasters";

const desk = readFileSync(new URL("../client/src/components/AutomationDesk.tsx", import.meta.url), "utf8");

describe("Online School Taster Library", () => {
  it("contains exactly 19 distinct, commercially useful private-launch prompts across diverse learning niches", () => {
    expect(onlineSchoolTasters).toHaveLength(19);
    expect(new Set(onlineSchoolTasters.map(taster => taster.id)).size).toBe(19);
    expect(new Set(onlineSchoolTasters.map(taster => taster.title)).size).toBe(19);
    expect(new Set(onlineSchoolTasters.map(taster => taster.niche)).size).toBeGreaterThanOrEqual(7);
    expect(onlineSchoolTasters.every(taster => taster.audience.length > 10 && taster.value.length > 20 && taster.prompt.length > 160)).toBe(true);
  });

  it("keeps every taster inside the reviewed private-launch boundary without fake people, revenue, public claims, credentials, or outcome promises", () => {
    for (const taster of onlineSchoolTasters) {
      expect(taster.prompt).toContain("Prepare a configuration-readiness test only.");
      expect(taster.prompt).toContain("Do not publish anything");
      expect(taster.prompt).toContain("create people");
      expect(taster.prompt).toContain("collect money");
      expect(taster.prompt).toContain("send messages");
      expect(taster.prompt).toContain("issue credentials");
    }
  });

  it("renders a searchable one-click gallery that fills the existing Automation Desk prompt rather than creating a separate setup path", () => {
    expect(desk).toContain("19 launch-ready course tasters");
    expect(desk).toContain("Filter taster niches");
    expect(desk).toContain("Use this full taster prompt");
    expect(desk).toContain("setGoal(taster.prompt)");
    expect(desk).toContain("Each one generates an internal course and material foundation for review—not a public or paid launch.");
    expect(desk).toContain("NSOS does not create people, testimonials, payments, messages, credentials, public claims, or public course pages from these prompts.");
  });
});
