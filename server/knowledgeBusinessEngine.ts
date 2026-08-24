import { invokeLLM } from "./_core/llm";

export type KnowledgeSourceType = "description" | "expertise_notes" | "structured_notes" | "course_material" | "transcript";
export type KnowledgeSourceFormat = "pasted_text" | "txt" | "markdown" | "csv" | "transcript_text";

export type KnowledgeBusinessAnalysis = {
  version: 1;
  summary: string;
  expertiseAreas: string[];
  themes: string[];
  coreConcepts: string[];
  learningObjectives: Array<{ title: string; outcome: string }>;
  prerequisiteQuestions: string[];
  knowledgeGaps: string[];
  programmeIdeas: Array<{ title: string; audience: string; outcome: string }>;
  projectIdeas: Array<{ title: string; brief: string }>;
  offerReadiness: { positioning: string; freeOfferDirection: string; coreOfferDirection: string; ownerDecisions: string[] };
  websiteReadiness: { headlineDirection: string; proofBoundary: string; ownerDecisions: string[] };
  qualityReview: { reviewQuestions: string[]; blockedAssumptions: string[] };
  builderPrompt: string;
  limitations: string[];
  source: "ai" | "guided";
  requiresConfirmation: true;
};

const restrictedSourcePattern = /(?:password|api[\s_-]*key|secret(?:\s+key)?|access[\s_-]*token|card\s+number|bank\s+account|guardian\s+record|student\s+record|assessment\s+submission)/i;
const disallowed = /\b(accredited|accreditation|certificate|certified|credential|guarantee(?:d)?|best|number\s*one|#1|government[-\s]?approved|officially approved|job placement|exam success|pass rate|qualified professional|free trial)\b|\b\d{1,3}%/gi;
const plainText = (value: unknown, maximum: number) => typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, " ").replace(disallowed, "").replace(/\s+/g, " ").trim().slice(0, maximum) : "";
const uniqueTexts = (items: unknown, maxItems: number, maxLength: number) => Array.isArray(items) ? Array.from(new Set(items.map(item => plainText(item, maxLength)).filter(Boolean))).slice(0, maxItems) : [];

export function validateKnowledgeSourceText(value: string) {
  const text = value.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  if (text.length < 80) throw new Error("Provide at least a short paragraph of approved knowledge or source material so NSOS can prepare a meaningful private analysis.");
  if (text.length > 12_000) throw new Error("Keep the first private knowledge source to 12,000 characters or fewer. Split longer material into separate approved sources.");
  if (restrictedSourcePattern.test(text)) throw new Error("Do not add passwords, API keys, bank/payment data, learner/guardian records, or assessment submissions to a knowledge source.");
  return text;
}

function fallbackAnalysis(input: { title: string; sourceType: KnowledgeSourceType; sourceText: string }): KnowledgeBusinessAnalysis {
  const focus = plainText(input.sourceText, 180) || "owner-approved knowledge";
  return {
    version: 1,
    summary: `A private, reviewable starting analysis based on ${input.sourceType.replaceAll("_", " ")} titled ${plainText(input.title, 120) || "knowledge source"}. Confirm all expertise, factual claims, target learners, and delivery assumptions before applying any separate workflow.`,
    expertiseAreas: ["Owner-approved topic area to confirm"],
    themes: ["Practical knowledge foundation", "Guided application", "Review and refinement"],
    coreConcepts: ["Foundational concept to verify", "Practical application to define", "Responsible review point"],
    learningObjectives: [
      { title: "Understand the foundation", outcome: "Describe the owner-approved core idea in their own words with human support." },
      { title: "Apply a practical method", outcome: "Complete a low-stakes, instructor-reviewed practice activity." },
      { title: "Reflect and improve", outcome: "Identify a next practice step through accountable feedback." },
    ],
    prerequisiteQuestions: ["What prior knowledge, tools, access, or support should a learner have?", "Which concepts require a qualified instructor or specialist review?"],
    knowledgeGaps: ["Confirm factual accuracy and source currency before teaching.", "Confirm intended learner level and delivery capacity before public or assessed use."],
    programmeIdeas: [{ title: "Practical foundation programme", audience: "Owner to confirm intended learners and entry expectations.", outcome: "Build one bounded, practical capability through instructor-reviewed practice." }],
    projectIdeas: [{ title: "Approved practical foundation project", brief: "Create one private, organisation-approved practical output with a human feedback point. It is not automatically scored, completed, credentialed, or public." }],
    offerReadiness: { positioning: "A clear private learning offer centred on practical application and accountable support.", freeOfferDirection: "Prepare one owner-reviewed introductory learning experience; do not publish it from this analysis.", coreOfferDirection: "Review one flagship programme direction before price, admissions, payment, or public claims are considered.", ownerDecisions: ["Confirm the learner problem and practical outcome.", "Confirm delivery, support, public copy, price, and refund decisions in their separate workflows."] },
    websiteReadiness: { headlineDirection: "Learning designed around accountable practice.", proofBoundary: "Do not add testimonials, results, learner outcomes, credential, employment, or performance claims without owner evidence and separate public-copy review.", ownerDecisions: ["Confirm public wording and contact details.", "Review Website Studio publication controls separately."] },
    qualityReview: { reviewQuestions: ["Which factual claims need an owner-approved source?", "Are prerequisites, difficulty progression, accessibility, and instructor support clear?", "Which topics need specialist review before becoming learning material?"], blockedAssumptions: ["No assessment, grade, completion, credential, or learner outcome is inferred.", "No price, demand, revenue, public claim, campaign, lead, or message is created."] },
    builderPrompt: `Build a private, review-first learning organisation from this owner-approved knowledge direction: ${focus}. Prepare one outcome-first practical programme, clear target-learner questions, non-graded practice and project ideas, private offer/website readiness, and protected handoffs. Do not publish, create people, price, charge, message, campaign, enrol, assess, grade, complete, certify, or make public claims.`,
    limitations: ["This is a private source analysis, not a factual verification, curriculum approval, qualification, assessment, learner placement, or public offer.", "It creates no programme, course material, website, price, campaign, lead, message, admission, enrolment, payment, credential, portfolio, result, completion, provider, domain, or scheduled work."],
    source: "guided",
    requiresConfirmation: true,
  };
}

function validateAnalysis(value: unknown, fallback: KnowledgeBusinessAnalysis): KnowledgeBusinessAnalysis {
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Record<string, unknown>;
  const objectives = Array.isArray(candidate.learningObjectives) ? candidate.learningObjectives.map(item => item && typeof item === "object" ? { title: plainText((item as Record<string, unknown>).title, 140), outcome: plainText((item as Record<string, unknown>).outcome, 360) } : null).filter((item): item is { title: string; outcome: string } => Boolean(item?.title && item.outcome)).slice(0, 6) : [];
  const programmes = Array.isArray(candidate.programmeIdeas) ? candidate.programmeIdeas.map(item => item && typeof item === "object" ? { title: plainText((item as Record<string, unknown>).title, 160), audience: plainText((item as Record<string, unknown>).audience, 300), outcome: plainText((item as Record<string, unknown>).outcome, 360) } : null).filter((item): item is { title: string; audience: string; outcome: string } => Boolean(item?.title && item.audience && item.outcome)).slice(0, 4) : [];
  const projects = Array.isArray(candidate.projectIdeas) ? candidate.projectIdeas.map(item => item && typeof item === "object" ? { title: plainText((item as Record<string, unknown>).title, 160), brief: plainText((item as Record<string, unknown>).brief, 600) } : null).filter((item): item is { title: string; brief: string } => Boolean(item?.title && item.brief)).slice(0, 4) : [];
  const offer = candidate.offerReadiness as Record<string, unknown> | undefined;
  const website = candidate.websiteReadiness as Record<string, unknown> | undefined;
  const quality = candidate.qualityReview as Record<string, unknown> | undefined;
  const next: KnowledgeBusinessAnalysis = {
    version: 1,
    summary: plainText(candidate.summary, 900),
    expertiseAreas: uniqueTexts(candidate.expertiseAreas, 6, 180),
    themes: uniqueTexts(candidate.themes, 8, 160),
    coreConcepts: uniqueTexts(candidate.coreConcepts, 8, 180),
    learningObjectives: objectives,
    prerequisiteQuestions: uniqueTexts(candidate.prerequisiteQuestions, 6, 240),
    knowledgeGaps: uniqueTexts(candidate.knowledgeGaps, 6, 240),
    programmeIdeas: programmes,
    projectIdeas: projects,
    offerReadiness: { positioning: plainText(offer?.positioning, 480), freeOfferDirection: plainText(offer?.freeOfferDirection, 480), coreOfferDirection: plainText(offer?.coreOfferDirection, 480), ownerDecisions: uniqueTexts(offer?.ownerDecisions, 5, 220) },
    websiteReadiness: { headlineDirection: plainText(website?.headlineDirection, 240), proofBoundary: plainText(website?.proofBoundary, 500), ownerDecisions: uniqueTexts(website?.ownerDecisions, 5, 220) },
    qualityReview: { reviewQuestions: uniqueTexts(quality?.reviewQuestions, 6, 240), blockedAssumptions: uniqueTexts(quality?.blockedAssumptions, 6, 240) },
    builderPrompt: plainText(candidate.builderPrompt, 1600),
    limitations: uniqueTexts(candidate.limitations, 5, 300),
    source: "ai",
    requiresConfirmation: true,
  };
  const valid = next.summary.length >= 60 && next.expertiseAreas.length >= 1 && next.themes.length >= 2 && next.coreConcepts.length >= 2 && next.learningObjectives.length >= 2 && next.prerequisiteQuestions.length >= 1 && next.knowledgeGaps.length >= 1 && next.programmeIdeas.length >= 1 && next.projectIdeas.length >= 1 && next.offerReadiness.positioning.length >= 30 && next.offerReadiness.freeOfferDirection.length >= 30 && next.offerReadiness.coreOfferDirection.length >= 30 && next.offerReadiness.ownerDecisions.length >= 2 && next.websiteReadiness.headlineDirection.length >= 10 && next.websiteReadiness.proofBoundary.length >= 30 && next.websiteReadiness.ownerDecisions.length >= 1 && next.qualityReview.reviewQuestions.length >= 2 && next.qualityReview.blockedAssumptions.length >= 2 && next.builderPrompt.length >= 80 && next.limitations.length >= 2;
  return valid ? next : fallback;
}

export async function analyseKnowledgeForBusiness(input: { title: string; sourceType: KnowledgeSourceType; sourceText: string }): Promise<KnowledgeBusinessAnalysis> {
  const sourceText = validateKnowledgeSourceText(input.sourceText);
  const fallback = fallbackAnalysis({ ...input, sourceText });
  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 2200,
      messages: [
        { role: "system", content: "You are NSOS Knowledge-to-Business Engine, a private planning assistant for owner-authorised educational source material. Analyse only the supplied text and return a concise, editable institutional planning analysis. Identify tentative expertise areas, themes, concepts, outcome-first learning objectives, prerequisite questions, knowledge gaps, private programme ideas, meaningful non-graded project ideas, private offer direction, website-copy review direction, and quality-review questions. Treat all factual claims as owner-review items. Never infer a learner’s performance, weakness, readiness, eligibility, career prospects, completion, or skill level. Never create, publish, price, sell, enroll, grade, assess, complete, credential, verify, message, campaign, generate a lead, collect payment, issue a refund, change a domain/provider, schedule work, or imply autonomous execution. Never claim accreditation, qualification, job/income outcome, demand, conversion, reputation, testimonials, results, or professional recognition. Do not quote the source verbatim, expose personal/financial information, or include passwords, secrets, credentials, or raw source material in your response. Return only the requested JSON." },
        { role: "user", content: `Private source title: ${plainText(input.title, 180)}\nSource type: ${input.sourceType}\nOwner-authorised source text:\n${sourceText.slice(0, 12_000)}` },
      ],
      response_format: { type: "json_schema", json_schema: { name: "nsos_knowledge_business_analysis", strict: true, schema: { type: "object", properties: { summary: { type: "string" }, expertiseAreas: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } }, themes: { type: "array", minItems: 2, maxItems: 8, items: { type: "string" } }, coreConcepts: { type: "array", minItems: 2, maxItems: 8, items: { type: "string" } }, learningObjectives: { type: "array", minItems: 2, maxItems: 6, items: { type: "object", properties: { title: { type: "string" }, outcome: { type: "string" } }, required: ["title", "outcome"], additionalProperties: false } }, prerequisiteQuestions: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } }, knowledgeGaps: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } }, programmeIdeas: { type: "array", minItems: 1, maxItems: 4, items: { type: "object", properties: { title: { type: "string" }, audience: { type: "string" }, outcome: { type: "string" } }, required: ["title", "audience", "outcome"], additionalProperties: false } }, projectIdeas: { type: "array", minItems: 1, maxItems: 4, items: { type: "object", properties: { title: { type: "string" }, brief: { type: "string" } }, required: ["title", "brief"], additionalProperties: false } }, offerReadiness: { type: "object", properties: { positioning: { type: "string" }, freeOfferDirection: { type: "string" }, coreOfferDirection: { type: "string" }, ownerDecisions: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } } }, required: ["positioning", "freeOfferDirection", "coreOfferDirection", "ownerDecisions"], additionalProperties: false }, websiteReadiness: { type: "object", properties: { headlineDirection: { type: "string" }, proofBoundary: { type: "string" }, ownerDecisions: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } } }, required: ["headlineDirection", "proofBoundary", "ownerDecisions"], additionalProperties: false }, qualityReview: { type: "object", properties: { reviewQuestions: { type: "array", minItems: 2, maxItems: 6, items: { type: "string" } }, blockedAssumptions: { type: "array", minItems: 2, maxItems: 6, items: { type: "string" } } }, required: ["reviewQuestions", "blockedAssumptions"], additionalProperties: false }, builderPrompt: { type: "string" }, limitations: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } } }, required: ["summary", "expertiseAreas", "themes", "coreConcepts", "learningObjectives", "prerequisiteQuestions", "knowledgeGaps", "programmeIdeas", "projectIdeas", "offerReadiness", "websiteReadiness", "qualityReview", "builderPrompt", "limitations"], additionalProperties: false } } },
    });
    return validateAnalysis(typeof response.choices[0]?.message.content === "string" ? JSON.parse(response.choices[0].message.content) : null, fallback);
  } catch {
    return fallback;
  }
}
