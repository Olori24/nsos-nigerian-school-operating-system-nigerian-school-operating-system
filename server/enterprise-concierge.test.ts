import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
vi.mock("./copilot", () => ({ destinationsForRole: vi.fn() }));

import { invokeLLM } from "./_core/llm";
import { destinationsForRole } from "./copilot";
import { buildEnterpriseConciergePlan } from "./enterpriseConcierge";

const financeAssessment = { completionPercent: 40, actions: [{ id: "finance" as const, label: "Finance", description: "", state: "needs_school_input" as const, executable: true, destination: "finance", safeguards: ["Creates inactive drafts only."] }] };

describe("Enterprise Concierge planning service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(destinationsForRole).mockImplementation(role => role === "parent" ? [{ id: "portal", label: "Family portal", description: "View linked family information.", keywords: ["fee", "payment", "family"] }] : [{ id: "finance", label: "Finance", description: "Review school finance operations.", keywords: ["fee", "payment", "finance"] }, { id: "overview", label: "Overview", description: "Review school operations.", keywords: ["overview"] }]);
  });

  it("accepts only an action from the caller's role-scoped workspace allowlist", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ reply: "Open the family payment area.", actionKind: "guidance", actionId: "portal", nextSteps: ["Review your linked family payment information."] }) } }] } as any);
    const plan = await buildEnterpriseConciergePlan({ request: "Where can I view family payments?", role: "parent" });
    expect(plan).toMatchObject({ source: "ai", action: { kind: "guidance", id: "portal", destination: "portal", requiresConfirmation: false } });
  });

  it("rejects a role-inappropriate or unsupported model action and returns deterministic safe guidance", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ reply: "I activated the fees.", actionKind: "prepare", actionId: "finance", nextSteps: ["Done."] }) } }] } as any);
    const plan = await buildEnterpriseConciergePlan({ request: "Where can I view family fees?", role: "parent" });
    expect(plan).toMatchObject({ source: "guided", action: { kind: "guidance", id: "portal", requiresConfirmation: false } });
    expect(plan.reply).not.toMatch(/activated|completed/i);
  });

  it("falls back to an owner review-first preparation plan when the model is unavailable", async () => {
    vi.mocked(invokeLLM).mockRejectedValue(new Error("model unavailable"));
    const plan = await buildEnterpriseConciergePlan({ request: "Help us prepare our approved term fees", role: "owner", assessment: financeAssessment });
    expect(plan).toMatchObject({ source: "guided", action: { kind: "prepare", id: "finance", destination: null, requiresConfirmation: true } });
    expect(plan.guardrail).toContain("will not create, invite, activate, publish, charge, or send");
  });
});
