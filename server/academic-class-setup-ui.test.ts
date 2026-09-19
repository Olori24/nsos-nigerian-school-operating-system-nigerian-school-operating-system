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
    expect(component).toContain("Schedule preview");
    expect(component).toContain("academic?.timetable");
    expect(component).toContain("No timetable entries yet.");
    expect(component).toContain("subjects.get(Number(entry.subjectId))");
    expect(component).toContain("scheduleTagStyles");
    expect(component).toContain("scheduleStyleFor");
    expect(component).toContain('aria-hidden="true"');
    expect(component).toContain("Room {entry.room}");
    expect(component).toContain("staffNames.get");
    expect(component).toContain("teacherId");
    expect(component).toContain('role="tooltip"');
    expect(component).toContain("Instructor");
    expect(component).toContain("Class description");
    expect(component).toContain("group-focus-within:visible");
    expect(component).toContain("setSelectedSchedule");
    expect(component).toContain("Schedule details");
    expect(component).toContain("<DialogContent");
    expect(component).toContain("Register a learner");
    expect(component).toContain("onRegister();");
    expect(component).toMatch(/does not enroll a\s+learner/);
    expect(component).toContain("isRegistering");
    expect(component).toContain("Registration review ready");
    expect(component).toContain("Opening Admissions…");
    expect(component).toContain("animate-spin");
    expect(component).toContain("window.setTimeout");
    expect(component).toContain("Standard Nigerian class presets");
    expect(component).toContain('"Basic 1"');
    expect(component).toContain('"Basic 6"');
    expect(component).toContain('"JSS 1"');
    expect(component).toContain('"JSS 3"');
    expect(component).toContain('"SS 1"');
    expect(component).toContain('"SS 3"');
    expect(component).toMatch(
      /Nothing is created until you\s+press\s+Create class/
    );
  });

  it("mounts the class workflow only in the school academic workspace", () => {
    expect(home).toContain("<AcademicClassSetup");
    expect(home).toContain("staff={staff.data ?? []}");
    expect(home).toContain('onRegister={() => onNavigate("admissions")}');
    expect(home).toContain('operatingType === "school"');
    expect(home).toContain("canConfigure={canConfigureCurriculum}");
  });
});
