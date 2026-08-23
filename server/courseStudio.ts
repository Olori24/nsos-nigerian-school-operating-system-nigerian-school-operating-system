import { invokeLLM } from "./_core/llm";

export type CourseStudioDeliveryMode = "in_person" | "live_online" | "self_paced" | "blended";
export type CourseStudioLearningType = "topic" | "practical" | "project" | "practice" | "resource";
export type CourseStudioMaterialType = "facilitator_guide" | "practice_activity" | "project_brief" | "discussion_prompt" | "reflection_prompt" | "resource_checklist";

export type CourseStudioModule = {
  title: string;
  description: string;
  learningType: CourseStudioLearningType;
  milestones: Array<{ title: string; description: string }>;
};

export type CourseStudioMaterial = {
  title: string;
  materialType: CourseStudioMaterialType;
  modulePosition: number;
  content: string;
};

export type CourseStudioEvidenceReference = {
  id: string;
  title: string;
  organisation: string;
  sourceUrl: string;
  category: "official_curriculum" | "global_pedagogy" | "institution_approved" | "professional_body" | "learning_resource";
  allowedUse: string;
};

export type CourseStudioLearningExperience = {
  learningPace: "guided" | "flexible" | "intensive";
  supportStyle: "balanced" | "step_by_step" | "worked_examples" | "concise_review";
  practiceMode: "reflection" | "guided_practice" | "project_based";
  accessibilityNote: string;
};

export type CourseStudioDraft = {
  courseTitle: string;
  courseSummary: string;
  deliveryMode: CourseStudioDeliveryMode;
  durationLabel: string;
  tutorBrief: string;
  evidenceReferences: CourseStudioEvidenceReference[];
  learningExperience: CourseStudioLearningExperience;
  modules: CourseStudioModule[];
  materials: CourseStudioMaterial[];
  setupRecommendation: string;
  limitations: string[];
  source: "ai" | "guided";
  requiresConfirmation: true;
};

export type CourseStudioRequest = {
  brief: string;
  audience: string;
  operatingType: "school" | "vocational_institute" | "coaching_centre" | "online_training_provider" | "hybrid_learning_provider" | "corporate_academy";
  deliveryMode?: CourseStudioDeliveryMode;
  durationPreference?: string;
  evidenceReferences?: CourseStudioEvidenceReference[];
  learningExperience?: CourseStudioLearningExperience;
};

const deliveryModes = new Set<CourseStudioDeliveryMode>(["in_person", "live_online", "self_paced", "blended"]);
const learningTypes = new Set<CourseStudioLearningType>(["topic", "practical", "project", "practice", "resource"]);
const materialTypes = new Set<CourseStudioMaterialType>(["facilitator_guide", "practice_activity", "project_brief", "discussion_prompt", "reflection_prompt", "resource_checklist"]);
const unsupportedClaims = /\b(accredited|accreditation|certified|certificate|credential|guarantee(?:d)?|100%|best|number\s*one|#1|government[-\s]?approved|officially approved|job placement|exam success|pass rate|qualified professional)\b/gi;

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum) : "";
}

function cleanLearningText(value: unknown, maximum: number) {
  return cleanText(value, maximum).replace(unsupportedClaims, "").replace(/\s{2,}/g, " ").trim();
}

function compactTopic(input: CourseStudioRequest) {
  return cleanLearningText(input.brief, 110) || "organisation-approved learning focus";
}

function safeExperience(input: CourseStudioRequest): CourseStudioLearningExperience {
  const experience = input.learningExperience ?? { learningPace: "guided" as const, supportStyle: "balanced" as const, practiceMode: "guided_practice" as const, accessibilityNote: "" };
  return {
    learningPace: experience.learningPace,
    supportStyle: experience.supportStyle,
    practiceMode: experience.practiceMode,
    accessibilityNote: cleanText(experience.accessibilityNote, 500),
  };
}

function safeEvidence(input: CourseStudioRequest): CourseStudioEvidenceReference[] {
  return (input.evidenceReferences ?? []).slice(0, 5).map(reference => ({
    id: cleanText(reference.id, 80),
    title: cleanText(reference.title, 180),
    organisation: cleanText(reference.organisation, 180),
    sourceUrl: cleanText(reference.sourceUrl, 2048),
    category: reference.category,
    allowedUse: cleanText(reference.allowedUse, 500),
  })).filter(reference => reference.id && reference.title && reference.organisation && reference.sourceUrl && reference.allowedUse);
}

function fallbackDraft(input: CourseStudioRequest): CourseStudioDraft {
  const topic = compactTopic(input);
  const deliveryMode = input.deliveryMode ?? "blended";
  const modules: CourseStudioModule[] = [
    { title: "Learning orientation", description: `Set an approved learning goal, learner expectations, and safe delivery routine for ${topic}.`, learningType: "topic", milestones: [{ title: "Review the learning goal", description: "A supervising instructor checks that the learner understands the internal learning goal and support route." }] },
    { title: "Guided core practice", description: `Use supervised instruction and practical practice relevant to ${topic}.`, learningType: "practice", milestones: [{ title: "Complete a supervised practice activity", description: "An instructor reviews participation or work using the organisation’s own criteria." }] },
    { title: "Reflection and next steps", description: "Review learning evidence, identify support needs, and agree on an instructor-led next step.", learningType: "project", milestones: [{ title: "Hold a human learning review", description: "A human reviewer records only an appropriate internal milestone status; this is not automatic completion or certification." }] },
  ];
  return {
    courseTitle: `${topic.slice(0, 92)} learning programme`,
    courseSummary: `An editable internal outline for ${input.audience || "the organisation’s intended learners"}. Review local curriculum, safeguarding, instructor, and delivery requirements before use.`,
    deliveryMode,
    durationLabel: cleanText(input.durationPreference, 120) || "Organisation to confirm duration",
    tutorBrief: "Prepare a supervised AI tutor only after an owner or administrator defines the approved subject scope, intended learner levels, and teacher escalation path in the existing tutor workspace.",
    evidenceReferences: safeEvidence(input),
    learningExperience: safeExperience(input),
    modules,
    materials: [
      { title: "Facilitator session guide", materialType: "facilitator_guide", modulePosition: 1, content: "Open with the approved learning goal, explain the support boundary, invite questions, and record only organisation-approved teaching notes. A human instructor remains responsible for delivery and safeguarding." },
      { title: "Guided practice prompt", materialType: "practice_activity", modulePosition: 2, content: "Ask learners to attempt a short, non-graded practice activity connected to the approved topic. Review work with a supervising instructor; do not use this prompt as a high-stakes assessment." },
      { title: "Reflection prompt", materialType: "reflection_prompt", modulePosition: 3, content: "Invite learners to describe one idea they understand, one point that needs support, and one instructor-approved next step. Escalate any concern through the organisation’s normal safeguarding route." },
    ],
    setupRecommendation: "Create the programme as an internal draft, review and activate it separately, then apply this outline as internal draft modules, milestones, and materials.",
    limitations: ["This guided fallback does not infer curriculum approval, accreditation, staffing, learner identity, fees, or a public offering.", "No programme, material, tutor, enrolment, message, credential, payment, or publication is created from this plan alone."],
    source: "guided",
    requiresConfirmation: true,
  };
}

function validateDraft(value: unknown, input: CourseStudioRequest, fallback: CourseStudioDraft): CourseStudioDraft | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const courseTitle = cleanLearningText(candidate.courseTitle, 180);
  const courseSummary = cleanLearningText(candidate.courseSummary, 1600);
  const deliveryMode = cleanText(candidate.deliveryMode, 24) as CourseStudioDeliveryMode;
  const durationLabel = cleanLearningText(candidate.durationLabel, 120);
  const tutorBrief = cleanLearningText(candidate.tutorBrief, 700);
  const setupRecommendation = cleanLearningText(candidate.setupRecommendation, 300);
  const limitations = Array.isArray(candidate.limitations) ? candidate.limitations.map(item => cleanLearningText(item, 220)).filter(Boolean).slice(0, 4) : [];
  if (courseTitle.length < 3 || courseSummary.length < 50 || !deliveryModes.has(deliveryMode) || durationLabel.length < 2 || tutorBrief.length < 20 || setupRecommendation.length < 10 || !limitations.length) return null;
  const modules = Array.isArray(candidate.modules) ? candidate.modules.map((item, index) => {
    if (!item || typeof item !== "object") return null;
    const raw = item as Record<string, unknown>;
    const title = cleanLearningText(raw.title, 180);
    const description = cleanLearningText(raw.description, 1200);
    const learningType = cleanText(raw.learningType, 24) as CourseStudioLearningType;
    const milestones = Array.isArray(raw.milestones) ? raw.milestones.map(milestone => {
      if (!milestone || typeof milestone !== "object") return null;
      const entry = milestone as Record<string, unknown>;
      const milestoneTitle = cleanLearningText(entry.title, 180);
      const milestoneDescription = cleanLearningText(entry.description, 1000);
      return milestoneTitle.length >= 2 && milestoneDescription.length >= 10 ? { title: milestoneTitle, description: milestoneDescription } : null;
    }).filter((item): item is { title: string; description: string } => Boolean(item)).slice(0, 4) : [];
    return title.length >= 2 && description.length >= 10 && learningTypes.has(learningType) && milestones.length ? { title, description, learningType, milestones } : null;
  }).filter((item): item is CourseStudioModule => Boolean(item)).slice(0, 6) : [];
  if (modules.length < 2 || new Set(modules.map(item => item.title.toLocaleLowerCase("en-NG"))).size !== modules.length) return null;
  const materials = Array.isArray(candidate.materials) ? candidate.materials.map(item => {
    if (!item || typeof item !== "object") return null;
    const raw = item as Record<string, unknown>;
    const title = cleanLearningText(raw.title, 180);
    const materialType = cleanText(raw.materialType, 40) as CourseStudioMaterialType;
    const modulePosition = Number(raw.modulePosition);
    const content = cleanLearningText(raw.content, 4500);
    return title.length >= 2 && materialTypes.has(materialType) && Number.isInteger(modulePosition) && modulePosition >= 1 && modulePosition <= modules.length && content.length >= 30 ? { title, materialType, modulePosition, content } : null;
  }).filter((item): item is CourseStudioMaterial => Boolean(item)).slice(0, 6) : [];
  if (materials.length < 2) return null;
  return { courseTitle, courseSummary, deliveryMode, durationLabel, tutorBrief, evidenceReferences: safeEvidence(input), learningExperience: safeExperience(input), modules, materials, setupRecommendation, limitations, source: "ai", requiresConfirmation: true };
}

export async function buildCourseStudioDraft(input: CourseStudioRequest) {
  const fallback = fallbackDraft(input);
  try {
    const result = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 4200,
      messages: [
        { role: "system", content: "You are NSOS Course Studio, a supervised planning assistant for Nigerian learning organisations. Produce an editable internal course blueprint for the owner’s supplied learning brief only. Support school enrichment, vocational training, coaching, online training, hybrid learning, and corporate-academy workplace-capability terminology according to the stated operating type. Give a practical but neutral course title, summary, one allowed delivery mode, duration label, 2–6 ordered learning modules, 1–4 non-graded internal milestones per module, 2–6 usable tutor/facilitator material drafts, an AI-tutor configuration brief, a protected setup recommendation, and limits. Selected evidence references are limited planning context, not proof of official alignment or authority to award a credential. Respect the supplied pace, support style, and practice mode, but do not make learner-level decisions. Never claim accreditation, official curriculum alignment, government approval, professional qualification, course completion, certification, learner achievement, examination success, job placement, income, safety, medical, legal, financial, or safeguarding advice. Never invent staff, instructors, learners, facilities, fees, timetables, contact details, citations, or public claims. Never create, activate, publish, enrol, assess, grade, message, invite, charge, collect payment, issue a credential, or configure a tutor. Treat milestones as human-reviewed learning checkpoints only. Course materials must be plain text, internal, non-public, non-graded, and should name a supervising human where appropriate. Do not request or repeat personal, financial, credential, provider, password, or bank information. Return only the requested JSON." },
        { role: "user", content: `Organisation operating type: ${input.operatingType}\nLearning brief: ${input.brief.trim().slice(0, 700)}\nIntended audience: ${input.audience.trim().slice(0, 220)}\nPreferred delivery mode: ${input.deliveryMode ?? "No preference"}\nPreferred duration: ${input.durationPreference?.trim().slice(0, 120) || "No preference"}\nLearning experience: pace=${safeExperience(input).learningPace}; support=${safeExperience(input).supportStyle}; practice=${safeExperience(input).practiceMode}; accessibility note=${safeExperience(input).accessibilityNote || "None supplied"}\nSelected evidence references: ${safeEvidence(input).map(reference => `${reference.title} (${reference.organisation}) — ${reference.allowedUse}`).join(" | ") || "No source selected; state that local source review is still required."}` },
      ],
      response_format: { type: "json_schema", json_schema: { name: "nsos_course_studio_draft", strict: true, schema: { type: "object", properties: { courseTitle: { type: "string" }, courseSummary: { type: "string" }, deliveryMode: { type: "string", enum: ["in_person", "live_online", "self_paced", "blended"] }, durationLabel: { type: "string" }, tutorBrief: { type: "string" }, modules: { type: "array", minItems: 2, maxItems: 6, items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, learningType: { type: "string", enum: ["topic", "practical", "project", "practice", "resource"] }, milestones: { type: "array", minItems: 1, maxItems: 4, items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } }, required: ["title", "description"], additionalProperties: false } } }, required: ["title", "description", "learningType", "milestones"], additionalProperties: false } }, materials: { type: "array", minItems: 2, maxItems: 6, items: { type: "object", properties: { title: { type: "string" }, materialType: { type: "string", enum: ["facilitator_guide", "practice_activity", "project_brief", "discussion_prompt", "reflection_prompt", "resource_checklist"] }, modulePosition: { type: "integer", minimum: 1, maximum: 6 }, content: { type: "string" } }, required: ["title", "materialType", "modulePosition", "content"], additionalProperties: false } }, setupRecommendation: { type: "string" }, limitations: { type: "array", minItems: 1, maxItems: 4, items: { type: "string" } } }, required: ["courseTitle", "courseSummary", "deliveryMode", "durationLabel", "tutorBrief", "modules", "materials", "setupRecommendation", "limitations"], additionalProperties: false } } },
    });
    const content = result.choices[0]?.message.content;
    return validateDraft(typeof content === "string" ? JSON.parse(content) : null, input, fallback) ?? fallback;
  } catch {
    return fallback;
  }
}
