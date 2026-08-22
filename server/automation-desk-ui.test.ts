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
});
