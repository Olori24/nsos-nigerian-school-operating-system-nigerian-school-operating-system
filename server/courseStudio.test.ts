import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));

import { invokeLLM } from "./_core/llm";
import { buildCourseStudioDraft } from "./courseStudio";

const request = { brief: "Create a practical introductory digital design course for young adults.", audience: "Young adults beginning digital design", operatingType: "vocational_institute" as const, deliveryMode: "blended" as const, durationPreference: "Six weeks" };

const validPlan = {
  courseTitle: "Digital design foundation",
  courseSummary: "A practical internal course outline that introduces approved design concepts through supervised discussion and guided practice.",
  deliveryMode: "blended",
  durationLabel: "Six weeks",
  tutorBrief: "Configure a supervised tutor only after a human defines the organisation-approved design scope, intended levels, and teacher escalation route.",
  modules: [
    { title: "Design basics", description: "Introduce approved concepts and safe learning routines through supervised instruction.", learningType: "topic", milestones: [{ title: "Review design vocabulary", description: "A human instructor checks that the learner can discuss the approved vocabulary." }] },
    { title: "Guided design practice", description: "Use non-graded practice activities and instructor feedback in the approved delivery context.", learningType: "practice", milestones: [{ title: "Review practice activity", description: "A human instructor reviews participation and agrees an appropriate next step." }] },
  ],
  materials: [
    { title: "Facilitator guide", materialType: "facilitator_guide", modulePosition: 1, content: "State the approved goal, introduce the learning boundaries, invite questions, and direct learners to a supervising instructor when support is needed." },
    { title: "Practice prompt", materialType: "practice_activity", modulePosition: 2, content: "Invite a short, non-graded design practice activity and use a human instructor review rather than automatic scoring or completion." },
  ],
  setupRecommendation: "Review the internal programme draft, then use the existing protected activation workflow when the organisation is ready.",
  limitations: ["This is an internal draft and does not confirm curriculum approval or qualification.", "No learner, payment, message, publication, or credential action is created from this plan."],
};

describe("NSOS Course Studio", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a review-first AI draft with bounded materials and strips unsupported claims", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ ...validPlan, courseTitle: "Accredited Digital Design Foundation", courseSummary: "A guaranteed and accredited practical internal course outline that introduces approved design concepts through supervised discussion and guided practice." }) } }] } as any);
    const draft = await buildCourseStudioDraft(request);
    expect(draft).toEqual(expect.objectContaining({ source: "ai", requiresConfirmation: true, deliveryMode: "blended" }));
    expect(draft.modules).toHaveLength(2);
    expect(draft.materials).toHaveLength(2);
    expect(`${draft.courseTitle} ${draft.courseSummary}`).not.toMatch(/accredited|guaranteed/i);
    expect(draft.limitations.join(" ")).toMatch(/No learner|No learner/i);
  });

  it("falls back to a bounded, reviewable plan when model output is invalid", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ ...validPlan, materials: [{ ...validPlan.materials[0], modulePosition: 99 }] }) } }] } as any);
    const draft = await buildCourseStudioDraft(request);
    expect(draft.source).toBe("guided");
    expect(draft.requiresConfirmation).toBe(true);
    expect(draft.materials.length).toBeGreaterThanOrEqual(2);
    expect(draft.limitations.join(" ")).toMatch(/No programme, material, tutor, enrolment/i);
  });
});
