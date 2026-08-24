import { buildCourseStudioDraft, type CourseStudioDraft } from "./courseStudio";
import { invokeLLM } from "./_core/llm";

export type InstitutionBuilderOperatingType = "school" | "vocational_institute" | "coaching_centre" | "online_training_provider" | "hybrid_learning_provider" | "corporate_academy";

export type InstitutionBlueprint = {
  version: 3;
  identity: { nameSuggestion: string; tagline: string; description: string; mission: string; vision: string; targetLearners: string; positioning: string };
  brandKit: { personality: string; colourDirection: string[]; typographyDirection: string; visualDirection: string; logoConcept: string; assetBoundary: string };
  websiteDraft: { headline: string; introduction: string; programmeCallout: string; faq: Array<{ question: string; answer: string }> };
  learning: { primaryProgramTitle: string; primaryProgramSummary: string; learningPathLabel: string; projectApproach: string };
  learningExperience: { moduleOutline: Array<{ title: string; purpose: string }>; lessonStarters: Array<{ title: string; outcome: string }>; projectBriefs: Array<{ title: string; brief: string }>; assessmentReadiness: string };
  studentExperience: { orientation: string; practiceSupport: string; nextStep: string };
  admissionsReadiness: { recommendedSteps: string[]; ownerDecisions: string[] };
  pricingReadiness: { approach: string; ownerDecisions: string[] };
  growthPlan: { freeOffer: string; coreOffer: string; continuationOffer: string; learnerJourney: string[]; contentThemes: string[]; ownerDecisions: string[]; boundary: string };
  qualityReadiness: { completedChecks: string[]; ownerDecisions: string[]; launchBlockers: string[] };
  lifecycleHandoffs: Array<{ label: string; destination: "learning" | "website" | "admissions" | "finance" | "communications" | "advertising" | "ai-tutors"; detail: string }>;
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
    brandKit: {
      personality: "Clear, capable, and practical.",
      colourDirection: ["Trust-building primary tone", "Accessible supporting tone", "Calm neutral surface"],
      typographyDirection: "Use a readable, modern type system with clear hierarchy for learning content.",
      visualDirection: "Use original practical-learning imagery or institution-approved media; avoid stock claims, copied brand cues, or invented outcomes.",
      logoConcept: "A simple original mark combining a learning path and a practical outcome motif; prepare only after owner review.",
      assetBoundary: "This is a private logo and brand-direction concept, not a generated, selected, licensed, or published asset.",
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
    learningExperience: {
      moduleOutline: [
        { title: "Start with the fundamentals", purpose: "Create a shared beginner foundation before practice begins." },
        { title: "Guided practical application", purpose: "Turn core ideas into a supervised real-world activity." },
        { title: "Review and next steps", purpose: "Use accountable review to decide what learners should practise next." },
      ],
      lessonStarters: [
        { title: "Welcome and learning agreement", outcome: "Learners understand the programme purpose, support route, and practical expectations." },
        { title: "First guided practice", outcome: "Learners complete a low-stakes activity and identify a next learning step." },
        { title: "Reflect and improve", outcome: "Learners use feedback to refine a practical piece of work." },
      ],
      projectBriefs: [{ title: "Practical foundation project", brief: "Create one institution-approved practical output that demonstrates practice, reflection, and a reviewer feedback point." }],
      assessmentReadiness: "Use formative practice and human-reviewed criteria. Configure any graded assessment, score, result, or certificate separately in the protected academic and issuer workflows.",
    },
    studentExperience: { orientation: "Prepare a clear welcome, support route, and programme expectation before inviting any learner.", practiceSupport: "Use instructor-led feedback and the existing safeguarded learning support tools; do not generate answers for high-stakes assessments.", nextStep: "After a reviewed milestone, offer an owner-approved next practice or programme recommendation rather than an automatic completion or credential." },
    admissionsReadiness: { recommendedSteps: ["Review the existing admissions workspace and institution-approved entry requirements.", "Decide which programme information and eligibility details may be shown publicly."], ownerDecisions: ["Approved admissions questions", "Approved contacts and safeguarding route"] },
    pricingReadiness: { approach: "Choose a value and delivery model first; enter any price only in the existing protected finance workflow after owner review.", ownerDecisions: ["Free, paid, cohort, bundle, membership, or subscription offer", "Approved fee scope and activation timing"] },
    growthPlan: {
      freeOffer: "Prepare one useful introductory learning experience for owner review; do not treat it as a public offer until the website and admissions workflows are approved.",
      coreOffer: "Review the flagship programme as the primary learning offer before any price, enrolment, or payment configuration is considered.",
      continuationOffer: "Consider a next practical pathway or continuing-learning option only after the owner defines a learner benefit and delivery capacity.",
      learnerJourney: ["Discover an approved public learning explanation", "Review eligibility and admissions requirements", "Enter only through an approved enrolment workflow", "Learn through instructor-supported practice", "Review an owner-approved next learning option"],
      contentThemes: ["Practical learning insight", "Behind-the-learning-process explanation", "Owner-approved learner question", "Programme and project readiness"],
      ownerDecisions: ["Approved offer terms and public claims", "Pricing, payment, and refund policy", "Campaign channels, budget, and message approvals"],
      boundary: "This is a private growth-planning aid. It creates no price, lead, campaign, testimonial, referral, discount, message, enrolment, payment, revenue claim, or scheduled work.",
    },
    qualityReadiness: { completedChecks: ["A primary programme concept is present.", "Private website, admissions, and pricing readiness notes are present.", "A practical project and assessment-readiness recommendation are present."], ownerDecisions: ["Review every factual, public, financial, and learner-facing statement.", "Confirm delivery, safeguarding, assessment, and credential policy before activation."], launchBlockers: ["No public website has been approved or published.", "No admissions, payment, provider, or notification configuration has been confirmed.", "No learner, instructor, grade, completion, or credential record has been created."] },
    lifecycleHandoffs: [
      { label: "Review the internal learning foundation", destination: "learning", detail: "Review draft programme, modules, milestones, materials, and instructor boundaries." },
      { label: "Review website content", destination: "website", detail: "Review approved public copy and use the separate publication controls only when ready." },
      { label: "Configure admissions", destination: "admissions", detail: "Set school-approved application questions and reviewer workflow separately." },
      { label: "Prepare pricing", destination: "finance", detail: "Prepare inactive fee structures in the protected finance workspace; no payment is created here." },
      { label: "Prepare learner communications", destination: "communications", detail: "Review welcome, orientation, inactivity, and follow-up wording before any message is approved or delivered." },
      { label: "Review protected advertising", destination: "advertising", detail: "Prepare owner-reviewed positioning and audience inputs in Advertising; no campaign, spend, or lead is created from this blueprint." },
      { label: "Review supervised learning support", destination: "ai-tutors", detail: "Configure approved tutor scope and accountable support separately; no learner assistant is activated here." },
    ],
  };
}

function validateConcept(value: unknown, fallback: InstitutionConcept): InstitutionConcept {
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Record<string, any>;
  const identity = candidate.identity as Record<string, unknown> | undefined;
  const brandKit = candidate.brandKit as Record<string, unknown> | undefined;
  const websiteDraft = candidate.websiteDraft as Record<string, unknown> | undefined;
  const learning = candidate.learning as Record<string, unknown> | undefined;
  const learningExperience = candidate.learningExperience as Record<string, unknown> | undefined;
  const studentExperience = candidate.studentExperience as Record<string, unknown> | undefined;
  const admissionsReadiness = candidate.admissionsReadiness as Record<string, unknown> | undefined;
  const pricingReadiness = candidate.pricingReadiness as Record<string, unknown> | undefined;
  const growthPlan = candidate.growthPlan as Record<string, unknown> | undefined;
  const qualityReadiness = candidate.qualityReadiness as Record<string, unknown> | undefined;
  const required = [identity, websiteDraft, learning, admissionsReadiness, pricingReadiness].every(Boolean);
  if (!required) return fallback;
  const next: InstitutionConcept = {
    identity: {
      nameSuggestion: plainText(identity?.nameSuggestion, 140), tagline: plainText(identity?.tagline, 180), description: plainText(identity?.description, 900), mission: plainText(identity?.mission, 500), vision: plainText(identity?.vision, 500), targetLearners: plainText(identity?.targetLearners, 360), positioning: plainText(identity?.positioning, 500),
    },
    brandKit: {
      personality: plainText(brandKit?.personality, 240) || fallback.brandKit.personality,
      colourDirection: uniqueTexts(brandKit?.colourDirection, 4, 100).length ? uniqueTexts(brandKit?.colourDirection, 4, 100) : fallback.brandKit.colourDirection,
      typographyDirection: plainText(brandKit?.typographyDirection, 360) || fallback.brandKit.typographyDirection,
      visualDirection: plainText(brandKit?.visualDirection, 500) || fallback.brandKit.visualDirection,
      logoConcept: plainText(brandKit?.logoConcept, 500) || fallback.brandKit.logoConcept,
      assetBoundary: plainText(brandKit?.assetBoundary, 320) || fallback.brandKit.assetBoundary,
    },
    websiteDraft: {
      headline: plainText(websiteDraft?.headline, 180), introduction: plainText(websiteDraft?.introduction, 1000), programmeCallout: plainText(websiteDraft?.programmeCallout, 240), faq: Array.isArray(websiteDraft?.faq) ? websiteDraft!.faq.map((item: unknown) => item && typeof item === "object" ? { question: plainText((item as Record<string, unknown>).question, 180), answer: plainText((item as Record<string, unknown>).answer, 500) } : null).filter((item): item is { question: string; answer: string } => Boolean(item?.question && item.answer)).slice(0, 4) : [],
    },
    learning: { primaryProgramTitle: plainText(learning?.primaryProgramTitle, 180), primaryProgramSummary: plainText(learning?.primaryProgramSummary, 1200), learningPathLabel: plainText(learning?.learningPathLabel, 100), projectApproach: plainText(learning?.projectApproach, 500) },
    learningExperience: {
      moduleOutline: (Array.isArray(learningExperience?.moduleOutline) ? learningExperience!.moduleOutline.map((item: unknown) => item && typeof item === "object" ? { title: plainText((item as Record<string, unknown>).title, 140), purpose: plainText((item as Record<string, unknown>).purpose, 360) } : null).filter((item): item is { title: string; purpose: string } => Boolean(item?.title && item.purpose)).slice(0, 6) : []).length ? (learningExperience!.moduleOutline as unknown[]).map((item: unknown) => item && typeof item === "object" ? { title: plainText((item as Record<string, unknown>).title, 140), purpose: plainText((item as Record<string, unknown>).purpose, 360) } : null).filter((item): item is { title: string; purpose: string } => Boolean(item?.title && item.purpose)).slice(0, 6) : fallback.learningExperience.moduleOutline,
      lessonStarters: (Array.isArray(learningExperience?.lessonStarters) ? learningExperience!.lessonStarters.map((item: unknown) => item && typeof item === "object" ? { title: plainText((item as Record<string, unknown>).title, 140), outcome: plainText((item as Record<string, unknown>).outcome, 360) } : null).filter((item): item is { title: string; outcome: string } => Boolean(item?.title && item.outcome)).slice(0, 6) : []).length ? (learningExperience!.lessonStarters as unknown[]).map((item: unknown) => item && typeof item === "object" ? { title: plainText((item as Record<string, unknown>).title, 140), outcome: plainText((item as Record<string, unknown>).outcome, 360) } : null).filter((item): item is { title: string; outcome: string } => Boolean(item?.title && item.outcome)).slice(0, 6) : fallback.learningExperience.lessonStarters,
      projectBriefs: (Array.isArray(learningExperience?.projectBriefs) ? learningExperience!.projectBriefs.map((item: unknown) => item && typeof item === "object" ? { title: plainText((item as Record<string, unknown>).title, 140), brief: plainText((item as Record<string, unknown>).brief, 600) } : null).filter((item): item is { title: string; brief: string } => Boolean(item?.title && item.brief)).slice(0, 4) : []).length ? (learningExperience!.projectBriefs as unknown[]).map((item: unknown) => item && typeof item === "object" ? { title: plainText((item as Record<string, unknown>).title, 140), brief: plainText((item as Record<string, unknown>).brief, 600) } : null).filter((item): item is { title: string; brief: string } => Boolean(item?.title && item.brief)).slice(0, 4) : fallback.learningExperience.projectBriefs,
      assessmentReadiness: plainText(learningExperience?.assessmentReadiness, 600) || fallback.learningExperience.assessmentReadiness,
    },
    studentExperience: { orientation: plainText(studentExperience?.orientation, 600) || fallback.studentExperience.orientation, practiceSupport: plainText(studentExperience?.practiceSupport, 600) || fallback.studentExperience.practiceSupport, nextStep: plainText(studentExperience?.nextStep, 600) || fallback.studentExperience.nextStep },
    admissionsReadiness: { recommendedSteps: uniqueTexts(admissionsReadiness?.recommendedSteps, 4, 220), ownerDecisions: uniqueTexts(admissionsReadiness?.ownerDecisions, 4, 160) },
    pricingReadiness: { approach: plainText(pricingReadiness?.approach, 420), ownerDecisions: uniqueTexts(pricingReadiness?.ownerDecisions, 4, 160) },
    growthPlan: {
      freeOffer: plainText(growthPlan?.freeOffer, 500) || fallback.growthPlan.freeOffer,
      coreOffer: plainText(growthPlan?.coreOffer, 500) || fallback.growthPlan.coreOffer,
      continuationOffer: plainText(growthPlan?.continuationOffer, 500) || fallback.growthPlan.continuationOffer,
      learnerJourney: uniqueTexts(growthPlan?.learnerJourney, 6, 240).length ? uniqueTexts(growthPlan?.learnerJourney, 6, 240) : fallback.growthPlan.learnerJourney,
      contentThemes: uniqueTexts(growthPlan?.contentThemes, 6, 180).length ? uniqueTexts(growthPlan?.contentThemes, 6, 180) : fallback.growthPlan.contentThemes,
      ownerDecisions: uniqueTexts(growthPlan?.ownerDecisions, 5, 220).length ? uniqueTexts(growthPlan?.ownerDecisions, 5, 220) : fallback.growthPlan.ownerDecisions,
      boundary: plainText(growthPlan?.boundary, 420) || fallback.growthPlan.boundary,
    },
    qualityReadiness: { completedChecks: uniqueTexts(qualityReadiness?.completedChecks, 6, 220).length ? uniqueTexts(qualityReadiness?.completedChecks, 6, 220) : fallback.qualityReadiness.completedChecks, ownerDecisions: uniqueTexts(qualityReadiness?.ownerDecisions, 5, 220).length ? uniqueTexts(qualityReadiness?.ownerDecisions, 5, 220) : fallback.qualityReadiness.ownerDecisions, launchBlockers: uniqueTexts(qualityReadiness?.launchBlockers, 6, 220).length ? uniqueTexts(qualityReadiness?.launchBlockers, 6, 220) : fallback.qualityReadiness.launchBlockers },
    lifecycleHandoffs: Array.isArray(candidate.lifecycleHandoffs) ? candidate.lifecycleHandoffs.map((item: unknown) => {
      if (!item || typeof item !== "object") return null;
      const entry = item as Record<string, unknown>;
      const destination = plainText(entry.destination, 24) as InstitutionBlueprint["lifecycleHandoffs"][number]["destination"];
      return ["learning", "website", "admissions", "finance", "communications", "advertising", "ai-tutors"].includes(destination) ? { label: plainText(entry.label, 120), destination, detail: plainText(entry.detail, 260) } : null;
    }).filter((item): item is InstitutionBlueprint["lifecycleHandoffs"][number] => Boolean(item?.label && item.detail)).slice(0, 6) : [],
  };
  const valid = next.identity.nameSuggestion.length >= 3 && next.identity.tagline.length >= 3 && next.identity.description.length >= 40 && next.identity.targetLearners.length >= 8 && next.brandKit.personality.length >= 10 && next.brandKit.colourDirection.length >= 2 && next.brandKit.typographyDirection.length >= 20 && next.brandKit.visualDirection.length >= 20 && next.brandKit.logoConcept.length >= 20 && next.brandKit.assetBoundary.length >= 20 && next.websiteDraft.headline.length >= 5 && next.websiteDraft.introduction.length >= 50 && next.websiteDraft.programmeCallout.length >= 5 && next.websiteDraft.faq.length >= 2 && next.learning.primaryProgramTitle.length >= 3 && next.learning.primaryProgramSummary.length >= 40 && next.learning.learningPathLabel.length >= 3 && next.learning.projectApproach.length >= 20 && next.learningExperience.moduleOutline.length >= 3 && next.learningExperience.lessonStarters.length >= 3 && next.learningExperience.projectBriefs.length >= 1 && next.learningExperience.assessmentReadiness.length >= 30 && next.studentExperience.orientation.length >= 30 && next.studentExperience.practiceSupport.length >= 30 && next.studentExperience.nextStep.length >= 30 && next.admissionsReadiness.recommendedSteps.length >= 2 && next.pricingReadiness.approach.length >= 20 && next.growthPlan.freeOffer.length >= 20 && next.growthPlan.coreOffer.length >= 20 && next.growthPlan.continuationOffer.length >= 20 && next.growthPlan.learnerJourney.length >= 3 && next.growthPlan.contentThemes.length >= 2 && next.growthPlan.ownerDecisions.length >= 2 && next.growthPlan.boundary.length >= 30 && next.qualityReadiness.completedChecks.length >= 3 && next.qualityReadiness.ownerDecisions.length >= 2 && next.qualityReadiness.launchBlockers.length >= 2 && next.lifecycleHandoffs.length >= 4;
  return valid ? next : fallback;
}

type PrivateBrandGrowth = Pick<InstitutionConcept, "brandKit" | "growthPlan">;

function validatePrivateBrandGrowth(value: unknown, fallback: PrivateBrandGrowth): PrivateBrandGrowth {
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Record<string, unknown>;
  const brand = candidate.brandKit as Record<string, unknown> | undefined;
  const growth = candidate.growthPlan as Record<string, unknown> | undefined;
  if (!brand || !growth) return fallback;
  const colourDirection = uniqueTexts(brand.colourDirection, 4, 100);
  const learnerJourney = uniqueTexts(growth.learnerJourney, 6, 240);
  const contentThemes = uniqueTexts(growth.contentThemes, 6, 180);
  const ownerDecisions = uniqueTexts(growth.ownerDecisions, 5, 220);
  const next: PrivateBrandGrowth = {
    brandKit: {
      personality: plainText(brand.personality, 240),
      colourDirection,
      typographyDirection: plainText(brand.typographyDirection, 360),
      visualDirection: plainText(brand.visualDirection, 500),
      logoConcept: plainText(brand.logoConcept, 500),
      assetBoundary: plainText(brand.assetBoundary, 320),
    },
    growthPlan: {
      freeOffer: plainText(growth.freeOffer, 500),
      coreOffer: plainText(growth.coreOffer, 500),
      continuationOffer: plainText(growth.continuationOffer, 500),
      learnerJourney,
      contentThemes,
      ownerDecisions,
      boundary: plainText(growth.boundary, 420),
    },
  };
  const valid = next.brandKit.personality.length >= 10 && next.brandKit.colourDirection.length >= 2 && next.brandKit.typographyDirection.length >= 20 && next.brandKit.visualDirection.length >= 20 && next.brandKit.logoConcept.length >= 20 && next.brandKit.assetBoundary.length >= 20 && next.growthPlan.freeOffer.length >= 20 && next.growthPlan.coreOffer.length >= 20 && next.growthPlan.continuationOffer.length >= 20 && next.growthPlan.learnerJourney.length >= 3 && next.growthPlan.contentThemes.length >= 2 && next.growthPlan.ownerDecisions.length >= 2 && next.growthPlan.boundary.length >= 30;
  return valid ? next : fallback;
}

async function buildPrivateBrandGrowth(input: { prompt: string; identity: InstitutionConcept["identity"]; fallback: PrivateBrandGrowth }): Promise<PrivateBrandGrowth> {
  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 1600,
      messages: [
        { role: "system", content: "You are the NSOS private brand and growth planner. Create only a concise, editable planning aid from the supplied owner idea and institution identity. Return an original brand personality, non-proprietary colour direction names, typography direction, visual direction, and a logo concept. Also return a private offer ladder with an introductory learning offer, core learning offer, continuation-learning option, a non-automated learner journey, educational content themes, and owner decisions. Do not create an image or logo asset, use or imitate existing brands, claim that an asset is licensed, publish anything, set or recommend numeric prices, generate a campaign, social post, email, lead, testimonial, review, discount, referral, affiliate, enrolment, payment, revenue, conversion, completion, certificate, or schedule. Do not claim outcomes, accreditation, demand, performance, or legal approval. State clearly that the output is private planning only and that website, finance, admissions, communications, advertising, and publication require separate protected owner review. Return only JSON." },
        { role: "user", content: `Owner idea: ${input.prompt.trim().slice(0, 700)}\nInstitution name suggestion: ${input.identity.nameSuggestion}\nPositioning: ${input.identity.positioning}\nTarget learners: ${input.identity.targetLearners}` },
      ],
      response_format: { type: "json_schema", json_schema: { name: "nsos_private_brand_growth", strict: true, schema: { type: "object", properties: { brandKit: { type: "object", properties: { personality: { type: "string" }, colourDirection: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } }, typographyDirection: { type: "string" }, visualDirection: { type: "string" }, logoConcept: { type: "string" }, assetBoundary: { type: "string" } }, required: ["personality", "colourDirection", "typographyDirection", "visualDirection", "logoConcept", "assetBoundary"], additionalProperties: false }, growthPlan: { type: "object", properties: { freeOffer: { type: "string" }, coreOffer: { type: "string" }, continuationOffer: { type: "string" }, learnerJourney: { type: "array", minItems: 3, maxItems: 6, items: { type: "string" } }, contentThemes: { type: "array", minItems: 2, maxItems: 6, items: { type: "string" } }, ownerDecisions: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } }, boundary: { type: "string" } }, required: ["freeOffer", "coreOffer", "continuationOffer", "learnerJourney", "contentThemes", "ownerDecisions", "boundary"], additionalProperties: false } }, required: ["brandKit", "growthPlan"], additionalProperties: false } } },
    });
    return validatePrivateBrandGrowth(typeof response.choices[0]?.message.content === "string" ? JSON.parse(response.choices[0].message.content) : null, input.fallback);
  } catch {
    return input.fallback;
  }
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
  const brandGrowth = await buildPrivateBrandGrowth({ prompt: input.prompt, identity: concept.identity, fallback: { brandKit: fallback.brandKit, growthPlan: fallback.growthPlan } });
  concept = { ...concept, ...brandGrowth };
  const courseDraft = await buildCourseStudioDraft({ brief: `${concept.learning.primaryProgramTitle}: ${concept.learning.primaryProgramSummary}. Practical approach: ${concept.learning.projectApproach}`, audience: concept.identity.targetLearners, operatingType: input.operatingType, deliveryMode: input.operatingType === "online_training_provider" ? "self_paced" : input.operatingType === "hybrid_learning_provider" ? "blended" : undefined, durationPreference: "Owner to review" });
  return { version: 3, ...concept, courseDraft, limitations: ["This is a private review blueprint. It creates no public institution, brand asset, accounts, learners, admissions, fees, invoices, payments, messages, campaigns, leads, credentials, grades, completion, provider configuration, domain, or publication.", "Only the approved internal programme, modules, milestones, and materials can be applied in this release. Brand asset, website, admissions, finance, communications, tutor, activation, publication, campaign, and credential decisions remain in their separate protected workflows."], source: source === "ai" && courseDraft.source === "ai" ? "ai" : "guided", requiresConfirmation: true };
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
