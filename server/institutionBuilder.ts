import { buildCourseStudioDraft, type CourseStudioDraft } from "./courseStudio";
import { invokeLLM } from "./_core/llm";

export type InstitutionBuilderOperatingType = "school" | "vocational_institute" | "coaching_centre" | "online_training_provider" | "hybrid_learning_provider" | "corporate_academy";

export type InstitutionBlueprint = {
  version: 1;
  identity: { nameSuggestion: string; tagline: string; description: string; mission: string; vision: string; targetLearners: string; positioning: string };
  websiteDraft: { headline: string; introduction: string; programmeCallout: string; faq: Array<{ question: string; answer: string }> };
  learning: { primaryProgramTitle: string; primaryProgramSummary: string; learningPathLabel: string; projectApproach: string };
  admissionsReadiness: { recommendedSteps: string[]; ownerDecisions: string[] };
  pricingReadiness: { approach: string; ownerDecisions: string[] };
  lifecycleHandoffs: Array<{ label: string; destination: "learning" | "website" | "admissions" | "finance" | "communications" | "ai-tutors"; detail: string }>;
  courseDraft: CourseStudioDraft;
  limitations: string[];
  source: "ai" | "guided";
  requiresConfirmation: true;
};

export type InstitutionBlueprintEdits = { nameSuggestion: string; tagline: string; description: string; targetLearners: string; positioning: string; primaryProgramTitle: string; primaryProgramSummary: string };

type InstitutionConcept = Omit<InstitutionBlueprint, "version" | "courseDraft" | "limitations" | "source" | "requiresConfirmation">;

const disallowed = /\b(accredited|accreditation|certificate|certified|credential|guarantee(?:d)?|best|number\s*one|#1|government[-\s]?approved|officially approved|job placement|exam success|pass rate|qualified professional|free trial)\b|\b\d{1,3}%/gi;
const plainText = (value: unknown, maximum: number) => typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, " ").replace(disallowed, "").replace(/\s+/g, " ").trim().slice(0, maximum) : "";
const uniqueTexts = (items: unknown, maximumItems: number, maximumLength: number) => Array.isArray(items) ? Array.from(new Set(items.map(item => plainText(item, maximumLength)).filter(Boolean))).slice(0, maximumItems) : [];

function fallbackConcept(input: { prompt: string; operatingType: InstitutionBuilderOperatingType }): InstitutionConcept {
  const focus = plainText(input.prompt, 100) || "organisation-approved learning";
  const typeLabel: Record<InstitutionBuilderOperatingType, string> = { school: "learning organisation", vocational_institute: "vocational training centre", coaching_centre: "coaching centre", online_training_provider: "online learning provider", hybrid_learning_provider: "hybrid learning provider", corporate_academy: "corporate academy" };
  return {
    identity: {
      nameSuggestion: `${focus.slice(0, 48)} learning studio`,
      tagline: "Practical learning, shaped for your organisation.",
      description: `An editable internal concept for a ${typeLabel[input.operatingType]} focused on ${focus}.`,
      mission: "Create a clear, human-reviewed learning experience around an approved institutional purpose.",
      vision: "Build a learning organisation that can improve its delivery through accountable local decisions.",
      targetLearners: "Organisation to confirm intended learners and eligibility.",
      positioning: "A practical, review-first learning offer with clear owner control.",
    },
    websiteDraft: {
      headline: "Learning designed around real practice.",
      introduction: "This is an editable, unpublished website starting point. Confirm every statement, contact detail, programme, admission setting, and public claim before any publication decision.",
      programmeCallout: "Explore the organisation-approved learning pathway.",
      faq: [
        { question: "Who is this learning offer for?", answer: "The owner must confirm the intended learners and entry expectations before publication." },
        { question: "How does learning work?", answer: "The owner must review the delivery approach, human support, and practical activity before activation." },
      ],
    },
    learning: { primaryProgramTitle: `${focus.slice(0, 72)} foundation`, primaryProgramSummary: "An editable internal programme foundation that needs owner and instructor review before activation.", learningPathLabel: input.operatingType === "corporate_academy" ? "Workplace capability path" : input.operatingType === "vocational_institute" ? "Vocational competency pathway" : "Learning pathway", projectApproach: "Use practical, non-graded activities reviewed by accountable instructors." },
    admissionsReadiness: { recommendedSteps: ["Review the existing admissions workspace and institution-approved entry requirements.", "Decide which programme information and eligibility details may be shown publicly."], ownerDecisions: ["Approved admissions questions", "Approved contacts and safeguarding route"] },
    pricingReadiness: { approach: "Choose a value and delivery model first; enter any price only in the existing protected finance workflow after owner review.", ownerDecisions: ["Free, paid, cohort, bundle, membership, or subscription offer", "Approved fee scope and activation timing"] },
    lifecycleHandoffs: [
      { label: "Review the internal learning foundation", destination: "learning", detail: "Review draft programme, modules, milestones, materials, and instructor boundaries." },
      { label: "Review website content", destination: "website", detail: "Review approved public copy and use the separate publication controls only when ready." },
      { label: "Configure admissions", destination: "admissions", detail: "Set school-approved application questions and reviewer workflow separately." },
      { label: "Prepare pricing", destination: "finance", detail: "Prepare inactive fee structures in the protected finance workspace; no payment is created here." },
    ],
  };
}

function validateConcept(value: unknown, fallback: InstitutionConcept): InstitutionConcept {
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Record<string, any>;
  const identity = candidate.identity as Record<string, unknown> | undefined;
  const websiteDraft = candidate.websiteDraft as Record<string, unknown> | undefined;
  const learning = candidate.learning as Record<string, unknown> | undefined;
  const admissionsReadiness = candidate.admissionsReadiness as Record<string, unknown> | undefined;
  const pricingReadiness = candidate.pricingReadiness as Record<string, unknown> | undefined;
  const required = [identity, websiteDraft, learning, admissionsReadiness, pricingReadiness].every(Boolean);
  if (!required) return fallback;
  const next: InstitutionConcept = {
    identity: {
      nameSuggestion: plainText(identity?.nameSuggestion, 140), tagline: plainText(identity?.tagline, 180), description: plainText(identity?.description, 900), mission: plainText(identity?.mission, 500), vision: plainText(identity?.vision, 500), targetLearners: plainText(identity?.targetLearners, 360), positioning: plainText(identity?.positioning, 500),
    },
    websiteDraft: {
      headline: plainText(websiteDraft?.headline, 180), introduction: plainText(websiteDraft?.introduction, 1000), programmeCallout: plainText(websiteDraft?.programmeCallout, 240), faq: Array.isArray(websiteDraft?.faq) ? websiteDraft!.faq.map((item: unknown) => item && typeof item === "object" ? { question: plainText((item as Record<string, unknown>).question, 180), answer: plainText((item as Record<string, unknown>).answer, 500) } : null).filter((item): item is { question: string; answer: string } => Boolean(item?.question && item.answer)).slice(0, 4) : [],
    },
    learning: { primaryProgramTitle: plainText(learning?.primaryProgramTitle, 180), primaryProgramSummary: plainText(learning?.primaryProgramSummary, 1200), learningPathLabel: plainText(learning?.learningPathLabel, 100), projectApproach: plainText(learning?.projectApproach, 500) },
    admissionsReadiness: { recommendedSteps: uniqueTexts(admissionsReadiness?.recommendedSteps, 4, 220), ownerDecisions: uniqueTexts(admissionsReadiness?.ownerDecisions, 4, 160) },
    pricingReadiness: { approach: plainText(pricingReadiness?.approach, 420), ownerDecisions: uniqueTexts(pricingReadiness?.ownerDecisions, 4, 160) },
    lifecycleHandoffs: Array.isArray(candidate.lifecycleHandoffs) ? candidate.lifecycleHandoffs.map((item: unknown) => {
      if (!item || typeof item !== "object") return null;
      const entry = item as Record<string, unknown>;
      const destination = plainText(entry.destination, 24) as InstitutionBlueprint["lifecycleHandoffs"][number]["destination"];
      return ["learning", "website", "admissions", "finance", "communications", "ai-tutors"].includes(destination) ? { label: plainText(entry.label, 120), destination, detail: plainText(entry.detail, 260) } : null;
    }).filter((item): item is InstitutionBlueprint["lifecycleHandoffs"][number] => Boolean(item?.label && item.detail)).slice(0, 6) : [],
  };
  const valid = next.identity.nameSuggestion.length >= 3 && next.identity.tagline.length >= 3 && next.identity.description.length >= 40 && next.identity.targetLearners.length >= 8 && next.websiteDraft.headline.length >= 5 && next.websiteDraft.introduction.length >= 50 && next.websiteDraft.programmeCallout.length >= 5 && next.websiteDraft.faq.length >= 2 && next.learning.primaryProgramTitle.length >= 3 && next.learning.primaryProgramSummary.length >= 40 && next.learning.learningPathLabel.length >= 3 && next.learning.projectApproach.length >= 20 && next.admissionsReadiness.recommendedSteps.length >= 2 && next.pricingReadiness.approach.length >= 20 && next.lifecycleHandoffs.length >= 4;
  return valid ? next : fallback;
}

export async function buildInstitutionBlueprint(input: { prompt: string; operatingType: InstitutionBuilderOperatingType }): Promise<InstitutionBlueprint> {
  const fallback = fallbackConcept(input);
  let concept = fallback;
  let source: "ai" | "guided" = "guided";
  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 2200,
      messages: [
        { role: "system", content: "You are the NSOS One-Prompt Institution Builder. Turn only the supplied owner idea into a concise, editable, private institution concept for the stated learning-organisation type. Give a neutral name suggestion, positioning, mission, vision, target learners, unpublished website-copy starter, one flagship programme concept, a learning-path label, practical non-graded project approach, admissions-readiness decisions, pricing-readiness decisions without prices, and direct handoffs to protected NSOS workspaces. Do not invent facts, people, instructors, staff, learners, testimonials, reviews, results, fees, amounts, contacts, facilities, policies, legal claims, accreditation, certificates, qualifications, job outcomes, public availability, or marketing performance. Never create or imply publication, accounts, enrolment, payments, messages, credentials, high-stakes assessment, completion, domains, providers, or public claims. The owner must review every draft and make separate protected decisions. Return only the requested JSON." },
        { role: "user", content: `Operating type: ${input.operatingType}\nOwner idea: ${input.prompt.trim().slice(0, 700)}` },
      ],
      response_format: { type: "json_schema", json_schema: { name: "nsos_institution_concept", strict: true, schema: { type: "object", properties: { identity: { type: "object", properties: { nameSuggestion: { type: "string" }, tagline: { type: "string" }, description: { type: "string" }, mission: { type: "string" }, vision: { type: "string" }, targetLearners: { type: "string" }, positioning: { type: "string" } }, required: ["nameSuggestion", "tagline", "description", "mission", "vision", "targetLearners", "positioning"], additionalProperties: false }, websiteDraft: { type: "object", properties: { headline: { type: "string" }, introduction: { type: "string" }, programmeCallout: { type: "string" }, faq: { type: "array", minItems: 2, maxItems: 4, items: { type: "object", properties: { question: { type: "string" }, answer: { type: "string" } }, required: ["question", "answer"], additionalProperties: false } } }, required: ["headline", "introduction", "programmeCallout", "faq"], additionalProperties: false }, learning: { type: "object", properties: { primaryProgramTitle: { type: "string" }, primaryProgramSummary: { type: "string" }, learningPathLabel: { type: "string" }, projectApproach: { type: "string" } }, required: ["primaryProgramTitle", "primaryProgramSummary", "learningPathLabel", "projectApproach"], additionalProperties: false }, admissionsReadiness: { type: "object", properties: { recommendedSteps: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } }, ownerDecisions: { type: "array", minItems: 1, maxItems: 4, items: { type: "string" } } }, required: ["recommendedSteps", "ownerDecisions"], additionalProperties: false }, pricingReadiness: { type: "object", properties: { approach: { type: "string" }, ownerDecisions: { type: "array", minItems: 1, maxItems: 4, items: { type: "string" } } }, required: ["approach", "ownerDecisions"], additionalProperties: false }, lifecycleHandoffs: { type: "array", minItems: 4, maxItems: 6, items: { type: "object", properties: { label: { type: "string" }, destination: { type: "string", enum: ["learning", "website", "admissions", "finance", "communications", "ai-tutors"] }, detail: { type: "string" } }, required: ["label", "destination", "detail"], additionalProperties: false } } }, required: ["identity", "websiteDraft", "learning", "admissionsReadiness", "pricingReadiness", "lifecycleHandoffs"], additionalProperties: false } } },
    });
    concept = validateConcept(typeof response.choices[0]?.message.content === "string" ? JSON.parse(response.choices[0].message.content) : null, fallback);
    source = concept === fallback ? "guided" : "ai";
  } catch {
    concept = fallback;
  }
  const courseDraft = await buildCourseStudioDraft({ brief: `${concept.learning.primaryProgramTitle}: ${concept.learning.primaryProgramSummary}. Practical approach: ${concept.learning.projectApproach}`, audience: concept.identity.targetLearners, operatingType: input.operatingType, deliveryMode: input.operatingType === "online_training_provider" ? "self_paced" : input.operatingType === "hybrid_learning_provider" ? "blended" : undefined, durationPreference: "Owner to review" });
  return { version: 1, ...concept, courseDraft, limitations: ["This is a private review blueprint. It creates no public institution, accounts, learners, admissions, fees, invoices, payments, messages, credentials, grades, completion, provider configuration, domain, or publication.", "Only the approved internal programme, modules, milestones, and materials can be applied in this release. Website, admissions, finance, communications, tutor, activation, publication, and credential decisions remain in their separate protected workflows."], source: source === "ai" && courseDraft.source === "ai" ? "ai" : "guided", requiresConfirmation: true };
}

export function reviseInstitutionBlueprint(blueprint: InstitutionBlueprint, edits: InstitutionBlueprintEdits): InstitutionBlueprint {
  const nameSuggestion = plainText(edits.nameSuggestion, 140);
  const tagline = plainText(edits.tagline, 180);
  const description = plainText(edits.description, 900);
  const targetLearners = plainText(edits.targetLearners, 360);
  const positioning = plainText(edits.positioning, 500);
  const primaryProgramTitle = plainText(edits.primaryProgramTitle, 180);
  const primaryProgramSummary = plainText(edits.primaryProgramSummary, 1200);
  if ([nameSuggestion, tagline, description, targetLearners, positioning, primaryProgramTitle, primaryProgramSummary].some(value => value.length < 3)) throw new Error("Complete every editable institution summary field before saving your changes.");
  return { ...blueprint, identity: { ...blueprint.identity, nameSuggestion, tagline, description, targetLearners, positioning }, learning: { ...blueprint.learning, primaryProgramTitle, primaryProgramSummary }, courseDraft: { ...blueprint.courseDraft, courseTitle: primaryProgramTitle, courseSummary: primaryProgramSummary }, source: "guided", requiresConfirmation: true };
}
