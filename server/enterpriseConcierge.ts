import { invokeLLM } from "./_core/llm";
import { destinationsForRole, type CopilotDestinationId } from "./copilot";
import type { SchoolRole } from "./roles";
import type { SetupAgentAction } from "./setupAgent";

export type ConciergeActionKind = "guidance" | "prepare" | "confirmation_required" | "unavailable";

export type EnterpriseConciergePlan = {
  reply: string;
  action: {
    kind: ConciergeActionKind;
    id: CopilotDestinationId | "academic_foundation" | "team" | "finance" | "manual";
    label: string;
    destination: CopilotDestinationId | null;
    requiresConfirmation: boolean;
  };
  nextSteps: string[];
  guardrail: string;
  source: "ai" | "guided";
};

type ReadinessAssessment = { completionPercent: number; actions: SetupAgentAction[] };
type LearningOperatingType = "school" | "vocational_institute" | "coaching_centre" | "online_training_provider" | "hybrid_learning_provider";

const executableSetupActions = new Set(["academic_foundation", "team", "finance"] as const);

function cleanText(value: unknown, limit: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) : "";
}

function closestDestination(request: string, role: SchoolRole) {
  const normalized = request.toLocaleLowerCase("en-NG");
  const destinations = destinationsForRole(role);
  return destinations.find(destination => destination.keywords.some(keyword => normalized.includes(keyword))) ?? destinations.find(destination => destination.id === "overview") ?? destinations[0] ?? null;
}

function fallbackPlan(input: { request: string; role: SchoolRole; assessment?: ReadinessAssessment }): EnterpriseConciergePlan {
  const normalized = input.request.toLocaleLowerCase("en-NG");
  const setup = input.assessment?.actions.find(action => !action.state.includes("complete") && executableSetupActions.has(action.id as "academic_foundation" | "team" | "finance") && ({ academic_foundation: ["academic", "class", "term", "session", "curriculum"], team: ["staff", "teacher", "team", "invite"], finance: ["fee", "finance", "invoice", "payment"] } as const)[action.id as "academic_foundation" | "team" | "finance"].some(term => normalized.includes(term)));
  if (setup) {
    return {
      reply: `${setup.label} is the safest supported next step. I can open the existing review-first workflow, where you provide approved details and explicitly confirm any change.`,
      action: { kind: "prepare", id: setup.id as "academic_foundation" | "team" | "finance", label: `Prepare ${setup.label.toLocaleLowerCase("en-NG")}`, destination: null, requiresConfirmation: true },
      nextSteps: [setup.safeguards[0] ?? "Review all school details before confirming.", "Use the secure workflow to enter approved information."],
      guardrail: "NSOS will not create, invite, activate, publish, charge, or send anything from this plan alone.",
      source: "guided",
    };
  }
  const destination = closestDestination(input.request, input.role);
  if (!destination) return { reply: "No school workspace is available for this request yet. Ask a school owner or administrator to confirm your access.", action: { kind: "guidance", id: "manual", label: "Review access", destination: null, requiresConfirmation: false }, nextSteps: ["Confirm you are signed into the correct school workspace."], guardrail: "NSOS cannot change school access from a prompt.", source: "guided" };
  return {
    reply: `I can guide you in ${destination.label}, the workspace that matches this request. I will not perform changes or reveal records from the prompt.`,
    action: { kind: "guidance", id: destination.id, label: `Open ${destination.label}`, destination: destination.id, requiresConfirmation: false },
    nextSteps: [destination.description, "Review the available records and use the workspace’s normal confirmation controls for any change."],
    guardrail: "This handoff respects your current school role and does not bypass permissions.",
    source: "guided",
  };
}

function validatePlan(value: unknown, input: { role: SchoolRole; assessment?: ReadinessAssessment; fallback: EnterpriseConciergePlan }): EnterpriseConciergePlan | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const kind = cleanText(candidate.actionKind, 20) as ConciergeActionKind;
  const id = cleanText(candidate.actionId, 50) as EnterpriseConciergePlan["action"]["id"];
  const reply = cleanText(candidate.reply, 800);
  const nextSteps = Array.isArray(candidate.nextSteps) ? candidate.nextSteps.map(item => cleanText(item, 180)).filter(Boolean).slice(0, 3) : [];
  const destination = destinationsForRole(input.role).find(item => item.id === id);
  const setup = input.assessment?.actions.find(action => action.id === id && !action.state.includes("complete") && executableSetupActions.has(action.id as "academic_foundation" | "team" | "finance"));
  if (!reply || !nextSteps.length || !["guidance", "prepare", "confirmation_required", "unavailable"].includes(kind)) return null;
  if (kind === "guidance" && destination) return { reply, action: { kind, id: destination.id, label: `Open ${destination.label}`, destination: destination.id, requiresConfirmation: false }, nextSteps, guardrail: "This handoff respects your current role and opens an existing protected workspace.", source: "ai" };
  if (kind === "confirmation_required" && destination) return { reply, action: { kind, id: destination.id, label: `Review ${destination.label}`, destination: destination.id, requiresConfirmation: true }, nextSteps, guardrail: "NSOS opens the existing protected workflow; review and explicit confirmation remain mandatory before a consequential action.", source: "ai" };
  if (kind === "prepare" && setup) return { reply, action: { kind, id: setup.id as "academic_foundation" | "team" | "finance", label: `Prepare ${setup.label.toLocaleLowerCase("en-NG")}`, destination: null, requiresConfirmation: true }, nextSteps, guardrail: "The Concierge prepares no change itself. The existing workflow requires approved details and explicit confirmation.", source: "ai" };
  if ((kind === "guidance" || kind === "unavailable") && id === "manual") return { reply, action: { kind, id: "manual", label: kind === "unavailable" ? "Review availability" : "Review guidance", destination: null, requiresConfirmation: false }, nextSteps, guardrail: "NSOS cannot carry out unsupported or high-impact work from a prompt.", source: "ai" };
  return null;
}

export async function buildEnterpriseConciergePlan(input: { request: string; role: SchoolRole; assessment?: ReadinessAssessment; operatingType?: LearningOperatingType }) {
  const fallback = fallbackPlan(input);
  const destinations = destinationsForRole(input.role).map(item => ({ id: item.id, label: item.label, description: item.description }));
  const setupActions = (input.assessment?.actions ?? []).filter(action => !action.state.includes("complete") && executableSetupActions.has(action.id as "academic_foundation" | "team" | "finance")).map(action => ({ id: action.id, label: action.label, safeguards: action.safeguards.slice(0, 1) }));
  try {
    const result = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 700,
      messages: [
        { role: "system", content: "You are NSOS Enterprise Concierge for a Nigerian learning organisation operating system. Turn a goal into one concise, grounded plan using only the supplied role-permitted navigation destinations and the supplied owner/admin preparation actions. Use the supplied operating type only to choose accurate terminology: schools use academic language; vocational institutes, coaching centres, and online-training providers may use programme, cohort, learner, and instructor language. You do not access records beyond the supplied readiness summary and operating type. You must never claim to have completed anything, change data, publish, invite, send messages, activate fees, collect or approve payments, configure a provider, connect a domain, create accounts, enrol learners, assign instructors, or issue or verify credentials. Never ask for passwords, tokens, card or bank details, provider credentials, learner, guardian, or staff personal information. If the request needs sensitive data, direct the user to the relevant protected form. Return only JSON." },
        { role: "user", content: `User role: ${input.role}\nOrganisation operating type: ${input.operatingType ?? "school"}\nRequest: ${input.request.trim().slice(0, 600)}\nPermitted workspaces: ${JSON.stringify(destinations)}\nSupported preparation actions: ${JSON.stringify(setupActions)}\nActual readiness: ${JSON.stringify(input.assessment ? { completionPercent: input.assessment.completionPercent } : "not available for this role")}` },
      ],
      response_format: { type: "json_schema", json_schema: { name: "nsos_enterprise_concierge_plan", strict: true, schema: { type: "object", properties: { reply: { type: "string" }, actionKind: { type: "string", enum: ["guidance", "prepare", "confirmation_required", "unavailable"] }, actionId: { type: "string" }, nextSteps: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } } }, required: ["reply", "actionKind", "actionId", "nextSteps"], additionalProperties: false } } },
    });
    const content = result.choices[0]?.message.content;
    return validatePlan(typeof content === "string" ? JSON.parse(content) : null, { role: input.role, assessment: input.assessment, fallback }) ?? fallback;
  } catch {
    return fallback;
  }
}
