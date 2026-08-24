import { describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));

import { invokeLLM } from "./_core/llm";
import { analyseKnowledgeForBusiness, validateKnowledgeSourceText } from "./knowledgeBusinessEngine";

const source = { title: "Digital marketing experience", sourceType: "expertise_notes" as const, sourceText: "I have ten years of experience helping Nigerian small businesses understand online customer acquisition. My notes cover customer research, practical content, simple websites, responsible advertising, measurement basics, and ways to review a campaign with the business owner." };
const validAnalysis = {
  summary: "A private planning analysis for practical owner-reviewed learning about responsible online customer acquisition.",
  expertiseAreas: ["Customer research"], themes: ["Practical customer acquisition", "Owner-reviewed digital channels"], coreConcepts: ["Audience understanding", "Responsible campaign planning"],
  learningObjectives: [{ title: "Define a customer problem", outcome: "Describe a customer problem and a practical response using owner-approved examples." }, { title: "Prepare a responsible plan", outcome: "Prepare a non-graded customer-acquisition plan for instructor review." }],
  prerequisiteQuestions: ["What learner tools and prior knowledge are required?"], knowledgeGaps: ["Confirm source currency and local advertising requirements before teaching."],
  programmeIdeas: [{ title: "Practical customer acquisition foundation", audience: "Owners to confirm intended small-business learners.", outcome: "Prepare a reviewable customer-acquisition foundation through practice." }],
  projectIdeas: [{ title: "Customer acquisition practice project", brief: "Prepare a private practice plan and obtain human feedback; do not score or publish it automatically." }],
  offerReadiness: { positioning: "A private learning direction for practical customer-acquisition practice.", freeOfferDirection: "Prepare an owner-reviewed introductory learning experience before considering public use.", coreOfferDirection: "Review a flagship practical programme before any price, admission, or payment decision.", ownerDecisions: ["Confirm delivery and public wording.", "Confirm price and refund decisions separately."] },
  websiteReadiness: { headlineDirection: "Practical customer acquisition learning, reviewed with care.", proofBoundary: "Do not make testimonials, outcome, credential, demand, or performance claims without owner evidence and public review.", ownerDecisions: ["Confirm public copy."] },
  qualityReview: { reviewQuestions: ["Which claims require a source review?", "Are prerequisites and accessibility clear?"], blockedAssumptions: ["No learner readiness or performance is inferred.", "No price, campaign, lead, payment, grade, completion, or credential is created."] },
  builderPrompt: "Build a private, review-first learning organisation for practical customer-acquisition learning with outcome-first projects and separate protected workflows.",
  limitations: ["This is a private analysis, not curriculum approval or a public offer.", "It creates no programme, price, learner, payment, assessment, result, completion, or credential."],
};

describe("Knowledge-to-Business Engine", () => {
  it("validates source text and rejects sensitive operational or learner data", () => {
    expect(validateKnowledgeSourceText(source.sourceText)).toContain("ten years of experience");
    expect(() => validateKnowledgeSourceText("A sufficient private source text that includes an API key for a production service and must never be analysed by this learning workflow because it is sensitive material.")).toThrow(/Do not add passwords, API keys/i);
  });

  it("returns a bounded private analysis and strips unsupported public or credential claims", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ ...validAnalysis, summary: "An accredited guaranteed 95% success programme for public launch with owner-reviewed practice.", websiteReadiness: { ...validAnalysis.websiteReadiness, headlineDirection: "Certified practical customer-acquisition learning with review" } }) } }] } as any);
    const analysis = await analyseKnowledgeForBusiness(source);
    expect(analysis).toMatchObject({ version: 1, source: "ai", requiresConfirmation: true });
    expect(analysis.summary).not.toMatch(/accredited|guaranteed|95%/i);
    expect(analysis.websiteReadiness.headlineDirection).not.toMatch(/certified/i);
    expect(analysis.limitations.join(" ")).toMatch(/creates no programme/i);
    expect(JSON.stringify(vi.mocked(invokeLLM).mock.calls[0]?.[0])).toContain("Never infer a learner’s performance");
  });

  it("falls back to a usable review-first analysis if model output is incomplete", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ summary: "Too short" }) } }] } as any);
    const analysis = await analyseKnowledgeForBusiness(source);
    expect(analysis.source).toBe("guided");
    expect(analysis.learningObjectives).toHaveLength(3);
    expect(analysis.builderPrompt).toMatch(/Do not publish/i);
    expect(analysis.qualityReview.blockedAssumptions.join(" ")).toMatch(/No assessment/i);
  });
});
