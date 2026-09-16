import { invokeLLM } from "./_core/llm";

export type CourseStudioDeliveryMode =
  | "in_person"
  | "live_online"
  | "self_paced"
  | "blended";
export type CourseStudioLearningType =
  | "topic"
  | "practical"
  | "project"
  | "practice"
  | "resource";
export type CourseStudioMaterialType =
  | "facilitator_guide"
  | "lesson_guide"
  | "practice_activity"
  | "knowledge_check"
  | "project_brief"
  | "discussion_prompt"
  | "reflection_prompt"
  | "revision_sheet"
  | "resource_checklist";

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
  category:
    | "official_curriculum"
    | "global_pedagogy"
    | "institution_approved"
    | "professional_body"
    | "learning_resource";
  allowedUse: string;
};

export type CourseStudioLearningExperience = {
  learningPace: "guided" | "flexible" | "intensive";
  supportStyle:
    | "balanced"
    | "step_by_step"
    | "worked_examples"
    | "concise_review";
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
  operatingType:
    | "school"
    | "vocational_institute"
    | "coaching_centre"
    | "online_training_provider"
    | "hybrid_learning_provider"
    | "corporate_academy";
  deliveryMode?: CourseStudioDeliveryMode;
  durationPreference?: string;
  evidenceReferences?: CourseStudioEvidenceReference[];
  learningExperience?: CourseStudioLearningExperience;
};

const deliveryModes = new Set<CourseStudioDeliveryMode>([
  "in_person",
  "live_online",
  "self_paced",
  "blended",
]);
const learningTypes = new Set<CourseStudioLearningType>([
  "topic",
  "practical",
  "project",
  "practice",
  "resource",
]);
const materialTypes = new Set<CourseStudioMaterialType>([
  "facilitator_guide",
  "lesson_guide",
  "practice_activity",
  "knowledge_check",
  "project_brief",
  "discussion_prompt",
  "reflection_prompt",
  "revision_sheet",
  "resource_checklist",
]);
const unsupportedClaims =
  /\b(accredited|accreditation|certified|certificate|credential|guarantee(?:d)?|100%|best|number\s*one|#1|government[-\s]?approved|officially approved|job placement|exam success|pass rate|qualified professional)\b/gi;

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string"
    ? value
        .replace(/[\u0000-\u001f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maximum)
    : "";
}

function cleanLearningText(value: unknown, maximum: number) {
  return cleanText(value, maximum)
    .replace(unsupportedClaims, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function compactTopic(input: CourseStudioRequest) {
  return (
    cleanLearningText(input.brief, 110) ||
    "organisation-approved learning focus"
  );
}

function isCodingForBeginnersEightWeekBrief(input: CourseStudioRequest) {
  const requestText =
    `${input.brief} ${input.durationPreference ?? ""}`.toLocaleLowerCase(
      "en-NG"
    );
  return (
    requestText.includes("coding for beginners") &&
    /\b(?:8|eight)\s*weeks?\b/.test(requestText)
  );
}

function safeExperience(
  input: CourseStudioRequest
): CourseStudioLearningExperience {
  const experience = input.learningExperience ?? {
    learningPace: "guided" as const,
    supportStyle: "balanced" as const,
    practiceMode: "guided_practice" as const,
    accessibilityNote: "",
  };
  return {
    learningPace: experience.learningPace,
    supportStyle: experience.supportStyle,
    practiceMode: experience.practiceMode,
    accessibilityNote: cleanText(experience.accessibilityNote, 500),
  };
}

function safeEvidence(
  input: CourseStudioRequest
): CourseStudioEvidenceReference[] {
  return (input.evidenceReferences ?? [])
    .slice(0, 5)
    .map(reference => ({
      id: cleanText(reference.id, 80),
      title: cleanText(reference.title, 180),
      organisation: cleanText(reference.organisation, 180),
      sourceUrl: cleanText(reference.sourceUrl, 2048),
      category: reference.category,
      allowedUse: cleanText(reference.allowedUse, 500),
    }))
    .filter(
      reference =>
        reference.id &&
        reference.title &&
        reference.organisation &&
        reference.sourceUrl &&
        reference.allowedUse
    );
}

function codingForBeginnersEightWeekGuidedDraft(
  input: CourseStudioRequest
): CourseStudioDraft {
  const deliveryMode = input.deliveryMode ?? "live_online";
  const modules: CourseStudioModule[] = [
    {
      title: "Week 1 — Coding orientation and digital setup",
      description:
        "Introduce the learning routine, safe digital workspace habits, computational thinking, and the idea of giving clear instructions to a computer.",
      learningType: "topic",
      milestones: [
        {
          title: "Review the learning routine",
          description:
            "A supervising facilitator checks that the learner can describe the support route, practice routine, and one example of an unambiguous instruction.",
        },
      ],
    },
    {
      title: "Week 2 — Problems, steps, and pseudocode",
      description:
        "Break a familiar task into ordered steps, identify assumptions, and draft plain-language pseudocode before using a programming tool.",
      learningType: "practice",
      milestones: [
        {
          title: "Review a step-by-step solution",
          description:
            "A facilitator reviews one learner-created sequence of steps and discusses any missing or unclear instruction without assigning a score.",
        },
      ],
    },
    {
      title: "Week 3 — Values, variables, input, and output",
      description:
        "Use small worked examples to explore how programs store values, receive input, and present a clear output.",
      learningType: "topic",
      milestones: [
        {
          title: "Discuss a variable example",
          description:
            "A supervising facilitator reviews the learner’s explanation of what changes and what stays the same in an approved example.",
        },
      ],
    },
    {
      title: "Week 4 — Decisions, repetition, and tracing",
      description:
        "Practise reading simple decisions and repeated steps, then trace a short approved example by hand before trying it in a supported tool.",
      learningType: "practice",
      milestones: [
        {
          title: "Walk through a traced example",
          description:
            "A facilitator reviews the learner’s trace and agrees an appropriate next practice step; this is not an examination or pass/fail decision.",
        },
      ],
    },
    {
      title: "Week 5 — Functions, testing, and simple debugging",
      description:
        "Introduce reusable instructions, predictable test cases, and a calm process for noticing, describing, and correcting small errors.",
      learningType: "practical",
      milestones: [
        {
          title: "Review a debugging note",
          description:
            "A human facilitator reviews how the learner described an expected result, an observed result, and one safe next test.",
        },
      ],
    },
    {
      title: "Week 6 — Web page structure and accessible content",
      description:
        "Create a simple approved web page structure with meaningful headings, short content sections, and basic accessibility-aware choices.",
      learningType: "practical",
      milestones: [
        {
          title: "Review page structure",
          description:
            "A supervising facilitator reviews the learner’s page outline for clear headings and logical content order without publishing it.",
        },
      ],
    },
    {
      title: "Week 7 — Styling, layout, and refinement",
      description:
        "Use beginner-friendly styling and layout practice to improve clarity, contrast, spacing, and readability in the internal web-page exercise.",
      learningType: "practice",
      milestones: [
        {
          title: "Review one design refinement",
          description:
            "A facilitator discusses one learner-selected readability or layout improvement and records only an appropriate internal next step.",
        },
      ],
    },
    {
      title: "Week 8 — Guided mini-project and human review",
      description:
        "Bring approved beginner concepts together in a small internal web-page or program demonstration, followed by reflection and facilitator feedback.",
      learningType: "project",
      milestones: [
        {
          title: "Hold a human project reflection",
          description:
            "A human reviewer discusses the learner’s chosen demonstration, support needs, and next learning step; it does not create completion, a credential, or a grade.",
        },
      ],
    },
  ];

  return {
    courseTitle: "Coding for Beginners",
    courseSummary:
      "An editable internal eight-week outline for beginner learners, covering programming logic, supported practical exercises, web basics, and a small guided capstone. Review local curriculum, safeguarding, facilitator capacity, and delivery requirements before use.",
    deliveryMode,
    durationLabel: cleanText(input.durationPreference, 120) || "Eight weeks",
    tutorBrief:
      "Prepare a supervised coding tutor only after an owner or administrator defines the approved beginner scope, intended learner levels, facilitator escalation route, and human review process in the existing tutor workspace.",
    evidenceReferences: safeEvidence(input),
    learningExperience: safeExperience(input),
    modules,
    materials: [
      {
        title: "Week 1 facilitator orientation guide",
        materialType: "facilitator_guide",
        modulePosition: 1,
        content:
          "Explain the eight-week learning routine, support boundary, safe use of the chosen practice environment, and the difference between guided practice and an assessed result. Invite questions and record only organisation-approved teaching notes.",
      },
      {
        title: "Week 2 problem-solving practice sheet",
        materialType: "practice_activity",
        modulePosition: 2,
        content:
          "Ask learners to turn one familiar task into clear ordered instructions, identify one assumption, and discuss a revised sequence with a supervising facilitator. Keep the activity non-graded.",
      },
      {
        title: "Week 3 variables worked-example guide",
        materialType: "lesson_guide",
        modulePosition: 3,
        content:
          "Use one organisation-reviewed example to explain values, variables, input, and output in plain language. Ask learners to restate what changes in the example and offer human support where needed.",
      },
      {
        title: "Week 4 decisions and repetition practice",
        materialType: "practice_activity",
        modulePosition: 4,
        content:
          "Guide learners through tracing an approved small decision and repetition example on paper or in a supported tool. Review the reasoning with a facilitator without calculating a score or completion outcome.",
      },
      {
        title: "Week 5 testing and debugging guide",
        materialType: "lesson_guide",
        modulePosition: 5,
        content:
          "Model a simple test: expected result, observed result, and one next check. Emphasise that errors are useful evidence for practice and that a human facilitator decides any further support.",
      },
      {
        title: "Week 6 accessible web-page lab",
        materialType: "practice_activity",
        modulePosition: 6,
        content:
          "Guide learners to create an internal web-page outline with meaningful headings, short sections, and a readability check. Do not publish the page or treat the activity as a public portfolio.",
      },
      {
        title: "Week 7 styling and layout refinement prompt",
        materialType: "reflection_prompt",
        modulePosition: 7,
        content:
          "Invite learners to identify one contrast, spacing, or layout improvement in their internal practice page and discuss the choice with a facilitator. Do not convert the reflection into a grade or completion status.",
      },
      {
        title: "Week 8 guided mini-project brief",
        materialType: "project_brief",
        modulePosition: 8,
        content:
          "Ask learners to combine approved beginner concepts in a small internal demonstration, explain one choice they made, and receive human feedback on a next learning step. This does not create a certificate, grade, or public work.",
      },
    ],
    setupRecommendation:
      "Create the programme as an internal draft, review and activate it separately, then apply the eight-week outline as internal draft modules, milestones, and materials only after owner review.",
    limitations: [
      "This guided outline does not infer curriculum approval, accreditation, staffing, learner identity, fees, or a public offering.",
      "No programme, material, tutor, enrolment, message, credential, payment, grade, or publication is created from this plan alone.",
    ],
    source: "guided",
    requiresConfirmation: true,
  };
}

function fallbackDraft(input: CourseStudioRequest): CourseStudioDraft {
  if (isCodingForBeginnersEightWeekBrief(input)) {
    return codingForBeginnersEightWeekGuidedDraft(input);
  }
  const topic = compactTopic(input);
  const deliveryMode = input.deliveryMode ?? "blended";
  const modules: CourseStudioModule[] = [
    {
      title: "Learning orientation",
      description: `Set an approved learning goal, learner expectations, and safe delivery routine for ${topic}.`,
      learningType: "topic",
      milestones: [
        {
          title: "Review the learning goal",
          description:
            "A supervising instructor checks that the learner understands the internal learning goal and support route.",
        },
      ],
    },
    {
      title: "Guided core practice",
      description: `Use supervised instruction and practical practice relevant to ${topic}.`,
      learningType: "practice",
      milestones: [
        {
          title: "Complete a supervised practice activity",
          description:
            "An instructor reviews participation or work using the organisation’s own criteria.",
        },
      ],
    },
    {
      title: "Reflection and next steps",
      description:
        "Review learning evidence, identify support needs, and agree on an instructor-led next step.",
      learningType: "project",
      milestones: [
        {
          title: "Hold a human learning review",
          description:
            "A human reviewer records only an appropriate internal milestone status; this is not automatic completion or certification.",
        },
      ],
    },
  ];
  return {
    courseTitle: `${topic.slice(0, 92)} learning programme`,
    courseSummary: `An editable internal outline for ${input.audience || "the organisation’s intended learners"}. Review local curriculum, safeguarding, instructor, and delivery requirements before use.`,
    deliveryMode,
    durationLabel:
      cleanText(input.durationPreference, 120) ||
      "Organisation to confirm duration",
    tutorBrief:
      "Prepare a supervised AI tutor only after an owner or administrator defines the approved subject scope, intended learner levels, and teacher escalation path in the existing tutor workspace.",
    evidenceReferences: safeEvidence(input),
    learningExperience: safeExperience(input),
    modules,
    materials: [
      {
        title: "Facilitator session guide",
        materialType: "facilitator_guide",
        modulePosition: 1,
        content:
          "Open with the approved learning goal, explain the support boundary, invite questions, and record only organisation-approved teaching notes. A human instructor remains responsible for delivery and safeguarding.",
      },
      {
        title: "Plain-language lesson guide",
        materialType: "lesson_guide",
        modulePosition: 1,
        content:
          "Explain one approved core idea in plain language, then use one organisation-reviewed example and ask learners to restate the idea in their own words. This is instructional guidance, not a score, examination, or completion decision.",
      },
      {
        title: "Guided practice prompt",
        materialType: "practice_activity",
        modulePosition: 2,
        content:
          "Ask learners to attempt a short, non-graded practice activity connected to the approved topic. Review work with a supervising instructor; do not use this prompt as a high-stakes assessment.",
      },
      {
        title: "Low-stakes knowledge check",
        materialType: "knowledge_check",
        modulePosition: 2,
        content:
          "Invite learners to answer two or three reflection questions about the approved topic, then review the explanation with a supervising instructor. Do not calculate a score, grade, pass/fail outcome, progress change, completion, or credential from this activity.",
      },
      {
        title: "Reflection prompt",
        materialType: "reflection_prompt",
        modulePosition: 3,
        content:
          "Invite learners to describe one idea they understand, one point that needs support, and one instructor-approved next step. Escalate any concern through the organisation’s normal safeguarding route.",
      },
      {
        title: "Revision sheet",
        materialType: "revision_sheet",
        modulePosition: 3,
        content:
          "Summarise the approved concepts, one practical example, common questions, and a learner-owned next practice step. A human instructor remains responsible for deciding any assessed work, score, result, completion, or credential.",
      },
    ],
    setupRecommendation:
      "Create the programme as an internal draft, review and activate it separately, then apply this outline as internal draft modules, milestones, and materials.",
    limitations: [
      "This guided fallback does not infer curriculum approval, accreditation, staffing, learner identity, fees, or a public offering.",
      "No programme, material, tutor, enrolment, message, credential, payment, or publication is created from this plan alone.",
    ],
    source: "guided",
    requiresConfirmation: true,
  };
}

/**
 * Produces the same bounded review-first outline used after an unavailable or
 * invalid model response, but without contacting a model provider.
 */
export function buildGuidedCourseStudioDraft(
  input: CourseStudioRequest
): CourseStudioDraft {
  return fallbackDraft(input);
}

function validateDraft(
  value: unknown,
  input: CourseStudioRequest,
  fallback: CourseStudioDraft
): CourseStudioDraft | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const courseTitle = cleanLearningText(candidate.courseTitle, 180);
  const courseSummary = cleanLearningText(candidate.courseSummary, 1600);
  const deliveryMode = cleanText(
    candidate.deliveryMode,
    24
  ) as CourseStudioDeliveryMode;
  const durationLabel = cleanLearningText(candidate.durationLabel, 120);
  const tutorBrief = cleanLearningText(candidate.tutorBrief, 700);
  const setupRecommendation = cleanLearningText(
    candidate.setupRecommendation,
    300
  );
  const limitations = Array.isArray(candidate.limitations)
    ? candidate.limitations
        .map(item => cleanLearningText(item, 220))
        .filter(Boolean)
        .slice(0, 4)
    : [];
  if (
    courseTitle.length < 3 ||
    courseSummary.length < 50 ||
    !deliveryModes.has(deliveryMode) ||
    durationLabel.length < 2 ||
    tutorBrief.length < 20 ||
    setupRecommendation.length < 10 ||
    !limitations.length
  )
    return null;
  const modules = Array.isArray(candidate.modules)
    ? candidate.modules
        .map((item, index) => {
          if (!item || typeof item !== "object") return null;
          const raw = item as Record<string, unknown>;
          const title = cleanLearningText(raw.title, 180);
          const description = cleanLearningText(raw.description, 1200);
          const learningType = cleanText(
            raw.learningType,
            24
          ) as CourseStudioLearningType;
          const milestones = Array.isArray(raw.milestones)
            ? raw.milestones
                .map(milestone => {
                  if (!milestone || typeof milestone !== "object") return null;
                  const entry = milestone as Record<string, unknown>;
                  const milestoneTitle = cleanLearningText(entry.title, 180);
                  const milestoneDescription = cleanLearningText(
                    entry.description,
                    1000
                  );
                  return milestoneTitle.length >= 2 &&
                    milestoneDescription.length >= 10
                    ? {
                        title: milestoneTitle,
                        description: milestoneDescription,
                      }
                    : null;
                })
                .filter(
                  (item): item is { title: string; description: string } =>
                    Boolean(item)
                )
                .slice(0, 4)
            : [];
          return title.length >= 2 &&
            description.length >= 10 &&
            learningTypes.has(learningType) &&
            milestones.length
            ? { title, description, learningType, milestones }
            : null;
        })
        .filter((item): item is CourseStudioModule => Boolean(item))
        .slice(0, 8)
    : [];
  if (
    modules.length < 2 ||
    new Set(modules.map(item => item.title.toLocaleLowerCase("en-NG"))).size !==
      modules.length
  )
    return null;
  const materials = Array.isArray(candidate.materials)
    ? candidate.materials
        .map(item => {
          if (!item || typeof item !== "object") return null;
          const raw = item as Record<string, unknown>;
          const title = cleanLearningText(raw.title, 180);
          const materialType = cleanText(
            raw.materialType,
            40
          ) as CourseStudioMaterialType;
          const modulePosition = Number(raw.modulePosition);
          const content = cleanLearningText(raw.content, 4500);
          return title.length >= 2 &&
            materialTypes.has(materialType) &&
            Number.isInteger(modulePosition) &&
            modulePosition >= 1 &&
            modulePosition <= modules.length &&
            content.length >= 30
            ? { title, materialType, modulePosition, content }
            : null;
        })
        .filter((item): item is CourseStudioMaterial => Boolean(item))
        .slice(0, 8)
    : [];
  if (materials.length < 2) return null;
  return {
    courseTitle,
    courseSummary,
    deliveryMode,
    durationLabel,
    tutorBrief,
    evidenceReferences: safeEvidence(input),
    learningExperience: safeExperience(input),
    modules,
    materials,
    setupRecommendation,
    limitations,
    source: "ai",
    requiresConfirmation: true,
  };
}

export async function buildCourseStudioDraft(input: CourseStudioRequest) {
  const fallback = fallbackDraft(input);
  try {
    const result = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 4200,
      messages: [
        {
          role: "system",
          content:
            "You are NSOS Course Studio, a supervised planning assistant for Nigerian learning organisations. Produce an editable internal course blueprint for the owner’s supplied learning brief only. Support school enrichment, vocational training, coaching, online training, hybrid learning, and corporate-academy workplace-capability terminology according to the stated operating type. Give a practical but neutral course title, summary, one allowed delivery mode, duration label, 2–6 ordered learning modules, 1–4 non-graded internal milestones per module, 2–6 usable tutor/facilitator material drafts, an AI-tutor configuration brief, a protected setup recommendation, and limits. Where useful, include plain-language lesson guides, low-stakes knowledge checks, and revision sheets; they must never calculate a score, grade, pass/fail result, progress change, completion, or credential. Selected evidence references are limited planning context, not proof of official alignment or authority to award a credential. Respect the supplied pace, support style, and practice mode, but do not make learner-level decisions. Never claim accreditation, official curriculum alignment, government approval, professional qualification, course completion, certification, learner achievement, examination success, job placement, income, safety, medical, legal, financial, or safeguarding advice. Never invent staff, instructors, learners, facilities, fees, timetables, contact details, citations, or public claims. Never create, activate, publish, enrol, assess, grade, message, invite, charge, collect payment, issue a credential, or configure a tutor. Treat milestones as human-reviewed learning checkpoints only. Course materials must be plain text, internal, non-public, non-graded, and should name a supervising human where appropriate. Do not request or repeat personal, financial, credential, provider, password, or bank information. Return only the requested JSON.",
        },
        {
          role: "user",
          content: `Organisation operating type: ${input.operatingType}\nLearning brief: ${input.brief.trim().slice(0, 700)}\nIntended audience: ${input.audience.trim().slice(0, 220)}\nPreferred delivery mode: ${input.deliveryMode ?? "No preference"}\nPreferred duration: ${input.durationPreference?.trim().slice(0, 120) || "No preference"}\nLearning experience: pace=${safeExperience(input).learningPace}; support=${safeExperience(input).supportStyle}; practice=${safeExperience(input).practiceMode}; accessibility note=${safeExperience(input).accessibilityNote || "None supplied"}\nSelected evidence references: ${
            safeEvidence(input)
              .map(
                reference =>
                  `${reference.title} (${reference.organisation}) — ${reference.allowedUse}`
              )
              .join(" | ") ||
            "No source selected; state that local source review is still required."
          }`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "nsos_course_studio_draft",
          strict: true,
          schema: {
            type: "object",
            properties: {
              courseTitle: { type: "string" },
              courseSummary: { type: "string" },
              deliveryMode: {
                type: "string",
                enum: ["in_person", "live_online", "self_paced", "blended"],
              },
              durationLabel: { type: "string" },
              tutorBrief: { type: "string" },
              modules: {
                type: "array",
                minItems: 2,
                maxItems: 8,
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    learningType: {
                      type: "string",
                      enum: [
                        "topic",
                        "practical",
                        "project",
                        "practice",
                        "resource",
                      ],
                    },
                    milestones: {
                      type: "array",
                      minItems: 1,
                      maxItems: 4,
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                        },
                        required: ["title", "description"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: [
                    "title",
                    "description",
                    "learningType",
                    "milestones",
                  ],
                  additionalProperties: false,
                },
              },
              materials: {
                type: "array",
                minItems: 2,
                maxItems: 8,
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    materialType: {
                      type: "string",
                      enum: [
                        "facilitator_guide",
                        "lesson_guide",
                        "practice_activity",
                        "knowledge_check",
                        "project_brief",
                        "discussion_prompt",
                        "reflection_prompt",
                        "revision_sheet",
                        "resource_checklist",
                      ],
                    },
                    modulePosition: { type: "integer", minimum: 1, maximum: 8 },
                    content: { type: "string" },
                  },
                  required: [
                    "title",
                    "materialType",
                    "modulePosition",
                    "content",
                  ],
                  additionalProperties: false,
                },
              },
              setupRecommendation: { type: "string" },
              limitations: {
                type: "array",
                minItems: 1,
                maxItems: 4,
                items: { type: "string" },
              },
            },
            required: [
              "courseTitle",
              "courseSummary",
              "deliveryMode",
              "durationLabel",
              "tutorBrief",
              "modules",
              "materials",
              "setupRecommendation",
              "limitations",
            ],
            additionalProperties: false,
          },
        },
      },
    });
    const content = result.choices[0]?.message.content;
    return (
      validateDraft(
        typeof content === "string" ? JSON.parse(content) : null,
        input,
        fallback
      ) ?? fallback
    );
  } catch {
    return fallback;
  }
}
