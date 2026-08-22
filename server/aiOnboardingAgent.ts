import { invokeLLM } from "./_core/llm";
import type { SetupAgentAction } from "./setupAgent";

export type AiSetupPlanActionId = SetupAgentAction["id"] | "manual";

export type AiSetupPlan = {
  reply: string;
  recommendedActionId: AiSetupPlanActionId;
  nextQuestions: string[];
  source: "ai" | "guided";
  requiresConfirmation: true;
};

type ReadinessAssessment = {
  completionPercent: number;
  actions: SetupAgentAction[];
};

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum) : "";
}

function fallbackPlan(request: string, assessment: ReadinessAssessment): AiSetupPlan {
  const normalized = request.toLocaleLowerCase("en-NG");
  const ranked = assessment.actions.filter(action => !action.state.includes("complete"));
  const match = ranked.find(action => {
    const terms: Record<SetupAgentAction["id"], string[]> = {
      academic_foundation: ["academic", "class", "term", "session", "curriculum", "subject"],
      team: ["team", "staff", "teacher", "employee", "invite"],
      learners: ["student", "learner", "admission", "guardian"],
      finance: ["finance", "fee", "invoice", "bank", "payment"],
      public_presence: ["website", "site", "domain", "public", "admission form"],
    };
    return terms[action.id].some(term => normalized.includes(term));
  }) ?? ranked[0];
  if (!match) return { reply: "Your core school setup looks complete. I can still help you review a workspace or plan the next approved improvement.", recommendedActionId: "manual", nextQuestions: ["Which workspace would you like to review?"], source: "guided", requiresConfirmation: true };
  const questions = match.id === "academic_foundation"
    ? ["What are the approved session and term dates?", "Which real class names should be created?", "Which reviewed curriculum starter matches the school?"]
    : match.id === "team"
      ? ["Which authorised staff member should be added first?", "Please add staff identity details directly in the secure invitation form rather than sharing them with the AI."]
      : match.id === "finance"
        ? ["Which approved fee should be prepared as an inactive draft?", "What amount, term, class scope, and due date has the school approved?"]
        : match.id === "public_presence"
          ? ["What school-approved purpose, learning approach, and admission information should the public website communicate?"]
          : ["Which authorised learner records are ready to be added through the Students workspace?"];
  return { reply: `${match.label} is the most useful next step. ${match.safeguards[0]}`, recommendedActionId: match.id, nextQuestions: questions, source: "guided", requiresConfirmation: true };
}

function validatePlan(value: unknown, assessment: ReadinessAssessment, fallback: AiSetupPlan): AiSetupPlan | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const actionId = cleanText(candidate.recommendedActionId, 40) as AiSetupPlanActionId;
  const allowedIds = new Set<AiSetupPlanActionId>([...assessment.actions.map(action => action.id), "manual"]);
  const action = assessment.actions.find(item => item.id === actionId);
  const reply = cleanText(candidate.reply, 700);
  const nextQuestions = Array.isArray(candidate.nextQuestions) ? candidate.nextQuestions.map(item => cleanText(item, 180)).filter(Boolean).slice(0, 3) : [];
  if (!reply || !allowedIds.has(actionId) || !nextQuestions.length) return null;
  if (action?.state === "complete") return fallback;
  return { reply, recommendedActionId: actionId, nextQuestions, source: "ai", requiresConfirmation: true };
}

export async function buildAiSetupPlan(input: { request: string; assessment: ReadinessAssessment }) {
  const fallback = fallbackPlan(input.request, input.assessment);
  const actionContext = input.assessment.actions.map(action => ({ id: action.id, label: action.label, state: action.state, executable: action.executable, safeguards: action.safeguards })).slice(0, 5);
  try {
    const result = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 600,
      messages: [
        { role: "system", content: "You are NSOS Onboarding Agent. Help a Nigerian school owner understand and complete school setup through the supplied readiness actions only. You may recommend one supplied action or manual. You must never claim to have completed an action, create, edit, publish, send, invite, activate, charge, connect a domain, configure credentials, or access records. All real changes are reviewed separately and require the signed-in owner or administrator to confirm. Do not ask for passwords, tokens, bank-account details, payment card data, learner or guardian personal data, or staff personal data. For staff data, direct the owner to the secure invitation form. Do not invent school facts, people, contact details, fees, credentials, or public claims. Ask only concise questions needed for the selected approved setup step. Return only the requested JSON." },
        { role: "user", content: `Owner request: ${input.request.trim().slice(0, 600)}\n\nActual tenant readiness: ${JSON.stringify({ completionPercent: input.assessment.completionPercent, actions: actionContext })}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "nsos_ai_setup_plan",
          strict: true,
          schema: {
            type: "object",
            properties: {
              reply: { type: "string" },
              recommendedActionId: { type: "string", enum: ["academic_foundation", "team", "learners", "finance", "public_presence", "manual"] },
              nextQuestions: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } },
            },
            required: ["reply", "recommendedActionId", "nextQuestions"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = result.choices[0]?.message.content;
    const raw = typeof content === "string" ? content : "";
    return validatePlan(JSON.parse(raw), input.assessment, fallback) ?? fallback;
  } catch {
    return fallback;
  }
}
