import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const copilot = readFileSync(resolve(root, "client/src/components/NsosCopilot.tsx"), "utf8");
const agent = readFileSync(resolve(root, "client/src/components/CopilotSetupAgent.tsx"), "utf8");
const planner = readFileSync(resolve(root, "client/src/components/AiSetupPlanner.tsx"), "utf8");
const websiteAgent = readFileSync(resolve(root, "client/src/components/WebsiteSetupAgent.tsx"), "utf8");

describe("NSOS Copilot setup agent interface", () => {
  it("keeps the setup agent inside the Copilot experience and restricts it to owner/admin roles", () => {
    expect(copilot).toContain("CopilotSetupAgent");
    expect(agent).toContain('role === "owner" || role === "admin"');
    expect(agent).toContain("The setup agent is available to the school owner and administrators.");
  });

  it("requires real academic inputs and an explicit confirmation before invoking the execution mutation", () => {
    expect(agent).toContain("The agent will not create placeholder classes.");
    expect(agent).toContain("I confirm these are school-approved academic details.");
    expect(agent).toContain("confirmed: true");
    expect(agent).toContain("Apply approved setup");
  });

  it("makes safe handoffs for setup areas that require school-provided people, finance, or publication information", () => {
    expect(agent).toContain("Open workspace");
    expect(agent).toContain("never invents staff, learners, bank accounts, provider credentials, or public content");
  });

  it("stages staff invitations and finance data with distinct explicit delivery and activation approvals", () => {
    expect(agent).toContain("Prepare invitation draft");
    expect(agent).toContain("I approve sending this invitation to the named school email.");
    expect(agent).toContain("Send approved invitation");
    expect(agent).toContain("Save inactive finance draft");
    expect(agent).toContain("I give final school approval to activate this fee structure.");
    expect(agent).toContain("Activate approved fee");
    expect(agent).toContain("Approval note");
    expect(agent).toContain("approvalNote: activationNote.trim() || undefined");
  });

  it("adds an AI onboarding planner that opens existing approval-gated workflows instead of executing setup itself", () => {
    expect(agent).toContain("AiSetupPlanner");
    expect(planner).toContain("NSOS AI onboarding agent");
    expect(planner).toContain("Confirmation stays with you");
    expect(planner).toContain("Open the approved workflow");
    expect(planner).toContain("It never acts by itself.");
  });

  it("makes the website agent generate editable AI drafts while preserving the draft-only save confirmation", () => {
    expect(websiteAgent).toContain("AI website-building agent");
    expect(websiteAgent).toContain("Build editable draft");
    expect(websiteAgent).toContain("Nothing has been published or saved yet.");
    expect(websiteAgent).toContain("Confirm and save draft");
    expect(websiteAgent).toContain("No publication, message sending, domain change, or data invention occurs here.");
  });
});
