import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const component = readFileSync(
  resolve(
    import.meta.dirname,
    "../client/src/components/SchoolSuccessLoop.tsx"
  ),
  "utf8"
);
const componentText = component.replace(/\s+/g, " ");
const operator = readFileSync(
  resolve(import.meta.dirname, "../client/src/components/SchoolOperator.tsx"),
  "utf8"
);
const operatorText = operator.replace(/\s+/g, " ");

describe("School Success Loop presentation", () => {
  it("is wired into the protected School Operator workspace", () => {
    expect(operatorText).toContain(
      'import { SchoolSuccessLoop } from "@/components/SchoolSuccessLoop";'
    );
    expect(operatorText).toContain(
      "<SchoolSuccessLoop data={data} onNavigate={onNavigate} />"
    );
    expect(componentText).toContain("school&apos;s current records");
    expect(componentText).toContain("onNavigate(action.destination)");
  });

  it("surfaces the daily rhythm and evidence-backed review cues", () => {
    expect(componentText).toContain("School Success Loop");
    expect(componentText).toContain("Know. Review. Act. Return tomorrow.");
    expect(componentText).toContain("Clear admissions queue");
    expect(componentText).toContain("Review cash position");
    expect(componentText).toContain("Check attendance");
    expect(componentText).toContain("Resolve priority review");
    expect(componentText).toContain("Morning");
    expect(componentText).toContain("During the day");
    expect(componentText).toContain("Close of day");
  });

  it("keeps the surface review-first and avoids autonomous consequential actions", () => {
    expect(componentText).toContain(
      "the school decides and executes the protected action"
    );
    expect(componentText).toContain(
      "Configuration evidence only. It is not an approval to publish or launch."
    );
    expect(componentText).not.toContain("mutate(");
    expect(componentText).not.toContain("fetch(");
    expect(componentText).not.toContain("send");
  });
});
