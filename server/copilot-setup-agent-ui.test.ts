import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const copilot = readFileSync(resolve(root, "client/src/components/NsosCopilot.tsx"), "utf8");
const agent = readFileSync(resolve(root, "client/src/components/CopilotSetupAgent.tsx"), "utf8");

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
});
