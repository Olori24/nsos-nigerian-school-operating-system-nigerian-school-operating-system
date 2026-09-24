import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const desk = readFileSync(new URL("../client/src/components/AutomationDesk.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("Automation Desk presentation", () => {
  it("provides a direct owner/admin Automation Desk route with a short reviewed job and one controlled run", () => {
    expect(home).toContain('id: "automation", label: "Automation Desk"');
    expect(home).toContain('roles: ["owner", "admin"]');
    expect(home).toContain('<AutomationDesk schoolId={schoolId} onNavigate={onNavigate} />');
    expect(desk).toContain("Tell NSOS what you want done. Approve one safe run.");
    expect(desk).toContain("Create automation job");
    expect(desk).toContain("Approve and run this job");
    expect(desk).toContain("Your automation history");
  });

  it("makes safe boundaries and honest recovery visible rather than presenting static navigation as completed automation", () => {
    expect(desk).toContain("No public action, email delivery, fee activation, provider change, account creation, payment, or credential outcome can run here.");
    expect(desk).toContain("NSOS will not create placeholder classes.");
    expect(desk).toContain("Automation needs a manual review");
    expect(desk).toContain("It did not retry automatically.");
    expect(desk).toContain("Open Course Studio");
    expect(desk).toContain("Open Website Studio");
  });

  it("offers a direct single-prompt online-school launcher with a private blueprint and configuration-only test boundary", () => {
    expect(desk).toContain("Launch an online school from one prompt");
    expect(desk).toContain("Use the single-prompt launcher");
    expect(desk).toContain("Private online-school foundation");
    expect(desk).toContain("Private launch ready for one approval");
    expect(desk).toContain("Approve private launch");
    expect(desk).toContain("Private launch configuration ready");
    expect(desk).toContain("It never creates mock people or launches publicly.");
    expect(desk).toContain("test people, payments, messages, public content, a tutor account, or credentials");
    expect(desk).toContain("Value preparation: review this internal offer");
  });

  it("keeps the 19-prompt taster gallery inside Automation Desk and routes every selection through the existing prompt field", () => {
    expect(desk).toContain("<TasterLibrary");
    expect(desk).toContain("onlineSchoolTasters");
    expect(desk).toContain("19 launch-ready course tasters");
    expect(desk).toContain("Use this full taster prompt");
    expect(desk).toContain('document.getElementById("automation-goal")?.scrollIntoView');
  });

  it("shows truthful, accessible planning progress only while a full private setup prompt is being prepared", () => {
    expect(desk).toContain("NSOS is preparing your private school blueprint");
    expect(desk).toContain("Reading your learning brief");
    expect(desk).toContain("Designing the private programme structure");
    expect(desk).toContain("Checking private-launch safeguards");
    expect(desk).toContain('role="progressbar"');
    expect(desk).toContain('aria-live="polite"');
    expect(desk).toContain("motion-reduce:animate-none");
    expect(desk).toContain("This is preparation, not a completed or public launch.");
    expect(desk).toContain("without creating a school, people, payments, messages, or public content");
    expect(desk).toContain("Building your private launch plan…");
  });
});
