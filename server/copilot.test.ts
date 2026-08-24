import { beforeEach, describe, expect, it, vi } from "vitest";

const llm = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/llm", () => llm);

import { destinationsForRole, getCopilotGuidance } from "./copilot";

describe("NSOS Copilot guidance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers each role only its permitted navigation destinations", () => {
    const parentDestinations = destinationsForRole("parent").map(item => item.id);
    expect(parentDestinations).toContain("portal");
    expect(parentDestinations).toContain("account");
    expect(parentDestinations).not.toContain("finance");
    expect(parentDestinations).not.toContain("admissions");
    expect(parentDestinations).not.toContain("institution-builder");
    expect(parentDestinations).not.toContain("school-operator");
    expect(destinationsForRole("owner").map(item => item.id)).toContain("institution-builder");
    expect(destinationsForRole("admin").map(item => item.id)).toContain("institution-builder");
    expect(destinationsForRole("owner").map(item => item.id)).toContain("school-operator");
    expect(destinationsForRole("admin").map(item => item.id)).toContain("school-operator");
    expect(destinationsForRole("teacher").map(item => item.id)).not.toContain("school-operator");
  });

  it("rejects an AI-selected destination outside the signed-in role and uses a safe fallback", async () => {
    llm.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ reply: "Open Finance.", destinationId: "finance", suggestions: [] }) } }] });
    const guidance = await getCopilotGuidance({ role: "parent", message: "Where can I see my child’s fees?" });
    expect(guidance.source).toBe("guided");
    expect(guidance.destination).not.toBe("finance");
    expect(destinationsForRole("parent").map(item => item.id)).toContain(guidance.destination);
  });

  it("falls back to safe local navigation guidance when the model is unavailable", async () => {
    llm.invokeLLM.mockRejectedValue(new Error("provider unavailable"));
    await expect(getCopilotGuidance({ role: "teacher", message: "Where do I record attendance?" })).resolves.toMatchObject({ destination: "attendance", source: "guided" });
  });
});
