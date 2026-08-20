import { invokeLLM } from "./_core/llm";

export type TutorResponse = { answer: string; studySteps: string[]; needsTeacherSupport: boolean; escalationReason: "" | "safeguarding" | "out_of_scope" | "needs_teacher_review" };

const sensitivePattern = /\b(suicide|self[-\s]?harm|kill myself|abuse|assault|pregnan|medical|medicine|drug|sex|nude|bully|threat|unsafe|hurt me)\b/i;

export async function generateSupervisedTutorResponse(input: { tutorName: string; subjectName: string; curriculumScope: string; allowedLevels: string[]; question: string }) {
  const question = input.question.trim().slice(0, 1800);
  if (sensitivePattern.test(question)) return { answer: "I’m not able to help with that here. Please speak to a trusted teacher, parent or guardian, or another safe adult now. You can use the support request in NSOS so the school team knows you need help.", studySteps: ["Stop using this tutor for this topic.", "Contact a trusted adult immediately."], needsTeacherSupport: true, escalationReason: "safeguarding" as const };
  const response = await invokeLLM({
    model: "gpt-5-mini",
    maxTokens: 800,
    messages: [
      { role: "system", content: "You are a supervised school study tutor, not a teacher of record or a replacement for adult supervision. Help only with the configured subject and curriculum scope. Explain concepts, give a short worked example when appropriate, and propose study steps. Do not conduct or grade an examination, make high-stakes academic decisions, provide answer keys for live tests, request or retain personal information, discuss medical/legal/financial matters, or give advice about personal safety, abuse, self-harm, sex, drugs, or relationships. Never claim qualifications or certainty. If the learner’s request is outside scope, needs a teacher’s judgment, might be a live graded assessment, or lacks essential context, set needsTeacherSupport true and explain in a neutral way that a supervising teacher should help. Return only the requested JSON." },
      { role: "user", content: `Tutor: ${input.tutorName}. Subject: ${input.subjectName}. Approved curriculum scope: ${input.curriculumScope.slice(0, 3000)}. Intended levels: ${input.allowedLevels.join(", ")}. Learner question: ${question}` },
    ],
    outputSchema: {
      name: "supervised_tutor_response",
      strict: true,
      schema: {
        type: "object",
        properties: { answer: { type: "string" }, studySteps: { type: "array", maxItems: 4, items: { type: "string" } }, needsTeacherSupport: { type: "boolean" }, escalationReason: { type: "string", enum: ["", "out_of_scope", "needs_teacher_review"] } },
        required: ["answer", "studySteps", "needsTeacherSupport", "escalationReason"],
        additionalProperties: false,
      },
    },
  });
  const content = response.choices[0]?.message.content;
  const raw = typeof content === "string" ? content : (content ?? []).filter(part => part.type === "text").map(part => part.text).join("");
  let result: TutorResponse;
  try { result = JSON.parse(raw) as TutorResponse; } catch { throw new Error("The tutor could not prepare a safe study response. Try again or ask your supervising teacher."); }
  const answer = String(result.answer ?? "").trim().slice(0, 2200);
  const studySteps = Array.isArray(result.studySteps) ? result.studySteps.map(step => String(step).trim().slice(0, 300)).filter(Boolean).slice(0, 4) : [];
  if (!answer || !studySteps.length) throw new Error("The tutor response was incomplete. Try again or ask your supervising teacher.");
  const escalationReason = result.needsTeacherSupport ? (result.escalationReason === "out_of_scope" ? "out_of_scope" : "needs_teacher_review") : "";
  return { answer, studySteps, needsTeacherSupport: Boolean(result.needsTeacherSupport), escalationReason };
}
