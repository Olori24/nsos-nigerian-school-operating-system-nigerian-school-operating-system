import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const panel = readFileSync(new URL("../client/src/components/GuardianProfilePanel.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("guardian profile panel interface", () => {
  it("shows linked guardian review fields and a controlled edit action", () => {
    expect(panel).toContain("Guardian review panel");
    expect(panel).toContain("Edit details");
    expect(panel).toContain("Save guardian details");
    expect(panel).toContain("Primary contact for this student");
    expect(panel).toContain("updateGuardian");
    expect(panel).toContain("Invite to portal");
    expect(panel).toContain("Confirm family portal invitation");
    expect(panel).toContain("Send confirmed invitation");
    expect(panel).toContain("sendGuardianPortalInvitation");
  });

  it("places the panel in the student workspace only for owner and administrator roles", () => {
    expect(home).toContain('(role === "owner" || role === "admin") && <GuardianProfilePanel');
  });
});
