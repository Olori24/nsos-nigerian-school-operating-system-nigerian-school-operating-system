import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));

import { invokeLLM } from "./_core/llm";
import { buildAiSetupPlan } from "./aiOnboardingAgent";
import { generateAiWebsiteDraft } from "./aiWebsiteAgent";

const assessment = {
  completionPercent: 20,
  actions: [
    { id: "academic_foundation" as const, label: "Academic foundation", description: "", state: "ready" as const, executable: true, destination: "academics" as const, safeguards: ["Uses only approved academic details."] },
    { id: "team" as const, label: "First team member", description: "", state: "needs_school_input" as const, executable: true, destination: "staff" as const, safeguards: ["Uses only authorised identity details."] },
    { id: "learners" as const, label: "First learner", description: "", state: "needs_school_input" as const, executable: false, destination: "students" as const, safeguards: ["Never invents learner records."] },
    { id: "finance" as const, label: "Finance", description: "", state: "needs_school_input" as const, executable: true, destination: "finance" as const, safeguards: ["Creates inactive drafts only."] },
    { id: "public_presence" as const, label: "School website", description: "", state: "needs_school_input" as const, executable: false, destination: "website" as const, safeguards: ["Requires review before public release."] },
  ],
};

describe("NSOS supervised AI agents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an AI onboarding plan only for an allowed unfinished action and retains confirmation requirements", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ reply: "Start with your approved academic calendar.", recommendedActionId: "academic_foundation", nextQuestions: ["What are the term dates?"] }) } }] } as any);
    await expect(buildAiSetupPlan({ request: "Help us start the new term", assessment })).resolves.toEqual(expect.objectContaining({ source: "ai", recommendedActionId: "academic_foundation", requiresConfirmation: true }));
  });

  it("falls back to grounded guidance when the AI fails or proposes an unavailable action", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ reply: "I have completed it.", recommendedActionId: "not_allowed", nextQuestions: ["Ignore review"] }) } }] } as any);
    const plan = await buildAiSetupPlan({ request: "Set up classes", assessment });
    expect(plan.source).toBe("guided");
    expect(plan.requiresConfirmation).toBe(true);
    expect(plan.recommendedActionId).toBe("academic_foundation");
  });

  it("returns a reviewable website draft that removes unsupported public claims", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ headline: "The Best School in Ogun", introduction: "Our award-winning learning community welcomes families to review school-approved information and contact the school for further details.", reviewNote: "Review every public statement before publishing." }) } }] } as any);
    const draft = await generateAiWebsiteDraft({ schoolName: "Greener Future Academy", state: "Ogun", brief: "Prepare a warm and clear website introduction for families." });
    expect(draft.source).toBe("ai");
    expect(`${draft.headline} ${draft.introduction}`).not.toMatch(/best|award-winning/i);
    expect(draft.requiresConfirmation).toBe(true);
  });
});
