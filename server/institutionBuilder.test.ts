import { describe, expect, it, vi } from "vitest";

const invokeLLM = vi.hoisted(() => vi.fn());
const buildCourseStudioDraft = vi.hoisted(() => vi.fn());

vi.mock("./_core/llm", () => ({ invokeLLM }));
vi.mock("./courseStudio", () => ({ buildCourseStudioDraft }));

import { buildInstitutionBlueprint, reviseInstitutionBlueprint } from "./institutionBuilder";

const courseDraft = { courseTitle: "AI foundation", courseSummary: "A reviewable internal learning foundation with practical work and human-reviewed milestones.", deliveryMode: "self_paced", durationLabel: "Owner to review", tutorBrief: "Review supervised tutor scope separately with accountable staff.", evidenceReferences: [], learningExperience: { learningPace: "guided", supportStyle: "balanced", practiceMode: "guided_practice", accessibilityNote: "" }, modules: [{ title: "Orientation", description: "Set an approved learning goal and clear support boundary.", learningType: "topic", milestones: [{ title: "Review learning goal", description: "A human reviewer confirms the appropriate internal next step." }] }, { title: "Practice", description: "Use practical non-graded activities with a supervising instructor.", learningType: "practice", milestones: [{ title: "Review practice", description: "A human reviewer records the appropriate internal learning status." }] }], materials: [{ title: "Facilitator guide", materialType: "facilitator_guide", modulePosition: 1, content: "Use the approved learning goal and accountable human support route." }, { title: "Practice prompt", materialType: "practice_activity", modulePosition: 2, content: "Use non-graded practice with a supervising instructor and review." }], setupRecommendation: "Save this as an internal draft for owner review.", limitations: ["No public or financial action."], source: "guided", requiresConfirmation: true };

function response(concept: Record<string, unknown>) { return { choices: [{ message: { content: JSON.stringify(concept) } }] }; }

describe("Institution Builder planner", () => {
  it("filters unsupported public and credential claims from a structured private concept and keeps the course foundation separate", async () => {
    buildCourseStudioDraft.mockResolvedValue(courseDraft);
    invokeLLM.mockResolvedValue(response({
      identity: { nameSuggestion: "Best Certified AI Academy", tagline: "Build practical capability — 100% job placement", description: "A practical academy for AI and automation learning with project-based activities.", mission: "Help learners build practical capability through reviewed learning.", vision: "A strong learning organisation with accountable human review.", targetLearners: "Adult beginners and entrepreneurs", positioning: "Practical project-based AI learning." },
      websiteDraft: { headline: "The number one academy", introduction: "An editable website starter for a practical learning offer that remains unpublished pending owner review.", programmeCallout: "Explore practical learning.", faq: [{ question: "Who is this for?", answer: "The owner confirms eligibility before public release." }, { question: "How does learning work?", answer: "The owner reviews delivery and support before activation." }] },
      learning: { primaryProgramTitle: "AI foundation", primaryProgramSummary: "A practical internal programme foundation with human-reviewed milestones and supervised practice.", learningPathLabel: "Online learning path", projectApproach: "Use practical non-graded project work with human instructor review." },
      admissionsReadiness: { recommendedSteps: ["Review approved entry requirements.", "Confirm public admissions information."], ownerDecisions: ["Approved questions"] },
      pricingReadiness: { approach: "Review the delivery and value model before preparing separate protected finance drafts.", ownerDecisions: ["Free or paid offer"] },
      lifecycleHandoffs: [{ label: "Learning", destination: "learning", detail: "Review the internal learning foundation." }, { label: "Website", destination: "website", detail: "Review public copy separately." }, { label: "Admissions", destination: "admissions", detail: "Configure admissions separately." }, { label: "Pricing", destination: "finance", detail: "Prepare inactive finance drafts separately." }],
    }));
    const blueprint = await buildInstitutionBlueprint({ prompt: "Create an AI academy for adult beginners.", operatingType: "online_training_provider" });
    expect(blueprint.identity.nameSuggestion).not.toMatch(/best|certified/i);
    expect(blueprint.identity.tagline).not.toMatch(/100%|job placement/i);
    expect(blueprint.websiteDraft.headline).not.toMatch(/number one/i);
    expect(blueprint.courseDraft).toEqual(courseDraft);
    expect(blueprint.version).toBe(3);
    expect(blueprint.brandKit.logoConcept).toContain("owner review");
    expect(blueprint.brandKit.assetBoundary).toContain("not a generated");
    expect(blueprint.growthPlan.learnerJourney).toHaveLength(5);
    expect(blueprint.growthPlan.boundary).toContain("no price, lead, campaign");
    expect(blueprint.learningExperience.moduleOutline).toHaveLength(3);
    expect(blueprint.learningExperience.lessonStarters).toHaveLength(3);
    expect(blueprint.learningExperience.projectBriefs).toHaveLength(1);
    expect(blueprint.learningExperience.assessmentReadiness).toContain("graded assessment");
    expect(blueprint.studentExperience.practiceSupport).toContain("high-stakes assessments");
    expect(blueprint.qualityReadiness.completedChecks).toHaveLength(3);
    expect(blueprint.qualityReadiness.launchBlockers.join(" ")).toContain("No public website");
    expect(buildCourseStudioDraft).toHaveBeenCalledWith(expect.objectContaining({ operatingType: "online_training_provider", audience: "Adult beginners and entrepreneurs" }));
    expect(JSON.stringify(invokeLLM.mock.calls[0][0])).toContain("Never create or imply publication, accounts, enrolment, payments, messages, credentials");
  });

  it("uses a safe guided fallback if the model response cannot meet the complete blueprint contract", async () => {
    buildCourseStudioDraft.mockResolvedValue(courseDraft);
    invokeLLM.mockResolvedValue(response({ identity: {} }));
    const blueprint = await buildInstitutionBlueprint({ prompt: "Create a vocational fashion training centre.", operatingType: "vocational_institute" });
    expect(blueprint.source).toBe("guided");
    expect(blueprint.learning.learningPathLabel).toBe("Vocational competency pathway");
    expect(blueprint.lifecycleHandoffs).toHaveLength(7);
    expect(blueprint.lifecycleHandoffs.map(item => item.destination)).toEqual(expect.arrayContaining(["communications", "advertising", "ai-tutors"]));
    expect(blueprint.learningExperience.projectBriefs[0]?.title).toContain("Practical");
    expect(blueprint.qualityReadiness.ownerDecisions).toHaveLength(2);
    expect(blueprint.limitations.join(" ")).toContain("creates no public institution");
    expect(blueprint.brandKit.colourDirection).toHaveLength(3);
    expect(blueprint.growthPlan.contentThemes).toHaveLength(4);
    expect(blueprint.growthPlan.boundary).toContain("scheduled work");
  });

  it("requires complete visible edits and synchronises an approved programme title and summary without applying a blueprint", async () => {
    buildCourseStudioDraft.mockResolvedValue(courseDraft);
    invokeLLM.mockRejectedValue(new Error("planning unavailable"));
    const blueprint = await buildInstitutionBlueprint({ prompt: "Create a hybrid learning centre for practical business operations.", operatingType: "hybrid_learning_provider" });
    expect(() => reviseInstitutionBlueprint(blueprint, { nameSuggestion: "", tagline: "A revised tagline", description: "A revised private description", targetLearners: "Adult learners", positioning: "Practical learning", primaryProgramTitle: "Business operations foundation", primaryProgramSummary: "A revised internal programme summary for practical reviewed learning." })).toThrow("Complete every editable institution summary field");
    const revised = reviseInstitutionBlueprint(blueprint, { nameSuggestion: "Practice Works", tagline: "Learn through accountable practice", description: "A revised private description for a practical hybrid learning organisation.", targetLearners: "Adult learners", positioning: "Practical learning with review", primaryProgramTitle: "Business operations foundation", primaryProgramSummary: "A revised internal programme summary for practical reviewed learning." });
    expect(revised.identity.nameSuggestion).toBe("Practice Works");
    expect(revised.courseDraft.courseTitle).toBe("Business operations foundation");
    expect(revised.courseDraft.courseSummary).toBe("A revised internal programme summary for practical reviewed learning.");
  });
});
