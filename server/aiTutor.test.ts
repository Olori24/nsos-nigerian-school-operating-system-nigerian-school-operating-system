import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeLLM } = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM }));

import { generateSupervisedTutorResponse } from "./aiTutor";

describe("supervised AI tutor response boundaries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("immediately routes sensitive learner content to a trusted adult without calling the model", async () => {
    const result = await generateSupervisedTutorResponse({ tutorName: "Science study guide", subjectName: "Science", curriculumScope: "Basic science explanations", allowedLevels: ["JSS 1"], question: "I feel unsafe and someone is hurting me." });
    expect(result).toMatchObject({ needsTeacherSupport: true, escalationReason: "safeguarding" });
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("returns a structured study response and preserves the teacher-review signal", async () => {
    invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ answer: "Start by identifying the variables in the expression.", studySteps: ["Write the expression clearly", "Group like terms"], needsTeacherSupport: true, escalationReason: "needs_teacher_review" }) } }] });
    const result = await generateSupervisedTutorResponse({ tutorName: "Mathematics study guide", subjectName: "Mathematics", curriculumScope: "Algebraic expressions only", allowedLevels: ["JSS 2"], question: "Can you check whether this is the correct method for my take-home practice?" });
    expect(result).toMatchObject({ needsTeacherSupport: true, escalationReason: "needs_teacher_review" });
    expect(result.studySteps).toHaveLength(2);
    expect(invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5-mini", outputSchema: expect.anything() }));
  });

  it("uses a bounded teaching-format instruction without widening tutor input data", async () => {
    invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ answer: "Work through one line at a time.", studySteps: ["Identify known values"], needsTeacherSupport: false, escalationReason: "" }) } }] });
    await generateSupervisedTutorResponse({ tutorName: "Mathematics study guide", subjectName: "Mathematics", curriculumScope: "Algebraic expressions only", allowedLevels: ["JSS 2"], question: "Explain how to simplify this expression.", teachingStyle: "step_by_step" });
    const request = invokeLLM.mock.calls[0]?.[0] as any;
    expect(request.messages[1].content).toContain("Use numbered, small steps");
    expect(request.messages[1].content).not.toContain("feedback comment");
  });
});
