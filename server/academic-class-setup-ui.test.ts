import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const component = readFileSync(
  resolve(
    import.meta.dirname,
    "../client/src/components/AcademicClassSetup.tsx"
  ),
  "utf8"
);
const home = readFileSync(
  resolve(import.meta.dirname, "../client/src/pages/Home.tsx"),
  "utf8"
);

describe("Academic class setup interface", () => {
  it("exposes a visible class-management workflow with a safe empty state", () => {
    expect(component).toContain('id="school-classes"');
    expect(component).toContain("No classes configured yet.");
    expect(component).toMatch(
      /class\s+selectors elsewhere will correctly show no available\s+choice/
    );
    expect(component).toContain("Tenant-scoped");
    expect(component).toContain("createClass.useMutation");
  });

  it("mounts the class workflow only in the school academic workspace", () => {
    expect(home).toContain("<AcademicClassSetup");
    expect(home).toContain('operatingType === "school"');
    expect(home).toContain("canConfigure={canConfigureCurriculum}");
  });
});
