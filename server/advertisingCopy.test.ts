import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));

import { invokeLLM } from "./_core/llm";
import { generateReviewableAdCopy } from "./advertisingCopy";

describe("review-first advertising copy generation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns exactly three editable suggestions and removes unsupported claims", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ suggestions: [{ primaryText: "The best school for your child — explore us.", headline: "100% Ready", callToAction: "learn_more", reviewNote: "Check all facts." }, { primaryText: "Plan a school visit.", headline: "Explore the school", callToAction: "contact_us", reviewNote: "Check all facts." }, { primaryText: "Learn about admissions.", headline: "Admissions enquiry", callToAction: "apply_now", reviewNote: "Check all facts." }] }) } }] } as any);
    const result = await generateReviewableAdCopy({ schoolName: "Greener Future Academy", objective: "lead_generation", locations: ["Abeokuta"], audienceNote: "Families considering admissions" });
    expect(result).toMatchObject({ requiresReview: true, publishingAction: "none" });
    expect(result.suggestions).toHaveLength(3);
    expect(result.suggestions[0].primaryText).not.toMatch(/best school/i);
    expect(result.suggestions[0].headline).not.toContain("100%");
    expect(invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5-mini", outputSchema: expect.any(Object) }));
    expect(vi.mocked(invokeLLM).mock.calls[0][0].messages[0].content).toContain("Never state or imply guarantees");
  });

  it("fails safely when the model does not return the required structured suggestions", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({ choices: [{ message: { content: "not JSON" } }] } as any);
    await expect(generateReviewableAdCopy({ schoolName: "School", objective: "awareness", locations: ["Lagos"] })).rejects.toThrow("could not be read");
  });
});
