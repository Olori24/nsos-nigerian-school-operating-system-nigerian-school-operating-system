import { invokeLLM } from "./_core/llm";
import { buildCourseStudioDraft, type CourseStudioDraft } from "./courseStudio";
import type { SetupAgentAction } from "./setupAgent";

export type AutomationJobType = "academic_foundation" | "online_school_launch" | "course_draft" | "website_draft" | "staff_invitation_draft" | "finance_draft" | "manual_review";
export type AutomationPlan = { jobType: AutomationJobType; title: string; summary: string; steps: string[]; missingFields: string[]; limitations: string[]; source: "ai" | "guided"; launchDraft?: CourseStudioDraft };
export type AcademicAutomationInput = { sessionName: string; sessionStartsOn: string; sessionEndsOn: string; termName: string; termStartsOn: string; termEndsOn: string; classes: Array<{ name: string; level?: string }>; templateId: "basic_primary" | "basic_junior_secondary" | "senior_secondary_review"; includeOptional: boolean };
export type StaffAutomationInput = { firstName: string; lastName: string; email: string; employeeNo: string; jobTitle: string; role: "admin" | "staff" | "teacher" | "finance"; employmentType: "full_time" | "part_time" | "contract" | "temporary" };
export type FinanceAutomationInput = { name: string; amount: number; termId?: number; classId?: number; mandatory: boolean; dueOn?: string };
export type OnlineSchoolLaunchInput = { draft: Pick<CourseStudioDraft, "courseTitle" | "courseSummary" | "deliveryMode" | "durationLabel" | "modules" | "materials">; validationMode: "private_configuration_only" };
export type ValidAutomationInput = AcademicAutomationInput | StaffAutomationInput | FinanceAutomationInput | OnlineSchoolLaunchInput;

type ReadinessAssessment = { completionPercent: number; actions: SetupAgentAction[] };
const allowedTypes: AutomationJobType[] = ["academic_foundation", "online_school_launch", "course_draft", "website_draft", "staff_invitation_draft", "finance_draft", "manual_review"];
const executableTypes = new Set<AutomationJobType>(["academic_foundation", "online_school_launch", "staff_invitation_draft", "finance_draft"]);
const isDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const text = (value: unknown, maximum: number) => typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum) : "";

function fallbackPlan(request: string, assessment: ReadinessAssessment): AutomationPlan {
  const normalized = request.toLocaleLowerCase("en-NG");
  const incomplete = assessment.actions.filter(action => action.state !== "complete");
  const choose = (jobType: AutomationJobType, title: string, summary: string, steps: string[], missingFields: string[], limitations: string[]): AutomationPlan => ({ jobType, title, summary, steps, missingFields, limitations, source: "guided" });
  if (/(online\s+(school|training)|launch.*(online|school)|set\s*up.*online|full\s+(online|digital)\s+(school|academy))/i.test(normalized)) return choose("online_school_launch", "Create a private online-school foundation", "Prepare one editable internal learning programme with draft curriculum, facilitator materials, an AI-tutor brief, and a configuration-readiness result from this prompt.", ["Review the private learning offer blueprint.", "Approve one internal draft-only run.", "Review the resulting programme and readiness record."], [], ["This creates draft-only internal learning records and configuration evidence in the current institution; it is not a public launch or a separate test school.", "No learner, guardian, staff, review, testimonial, fee, invoice, payment, message, website publication, domain, provider, tutor account, credential, or public content is created."]);
  if (/(course|programme|program|curriculum|material|training|coaching|vocational)/.test(normalized)) return choose("course_draft", "Prepare a reviewed course blueprint", "Create an editable internal programme, curriculum, and material blueprint in Course Studio.", ["Confirm the learning offer and intended learners.", "Review the generated modules and materials.", "Save inactive internal drafts."], ["Learning offer", "Intended learners"], ["Course content requires a full editable review in Course Studio before any internal draft is saved.", "No public course, learner enrolment, tutor, fee, message, or credential is created."]);
  if (/(website|site|domain|public|admission form)/.test(normalized)) return choose("website_draft", "Prepare a private website proposal", "Create an editable school website proposal with approved information only.", ["Provide school-approved public information.", "Review the private website draft.", "Use the separate publication control if the school approves."], ["Public purpose", "Approved contact and admissions information"], ["Website application, publication, domain connection, and DNS verification remain separate approvals."]);
  if (/(staff|teacher|team|employee|invite)/.test(normalized)) return choose("staff_invitation_draft", "Prepare a staff invitation draft", "Prepare one private invitation draft from school-approved staff details. It will not send an email.", ["Enter authorised staff identity and role details.", "Review the private invitation draft.", "Use the separate send confirmation if delivery is approved."], ["Staff member’s approved identity and role details"], ["The agent never sends an invitation, creates an account, or creates a staff profile from this job."]);
  if (/(fee|finance|invoice|payment|bank)/.test(normalized)) return choose("finance_draft", "Prepare an inactive fee draft", "Prepare one tenant-scoped fee structure draft from an approved amount and scope.", ["Enter the approved fee details.", "Review the inactive fee draft.", "Use the separate final activation control if approved."], ["Approved fee name and amount"], ["The job never activates a fee, issues an invoice, collects payment, changes a bank account, or touches provider credentials."]);
  const academic = incomplete.find(action => action.id === "academic_foundation");
  if (academic) return choose("academic_foundation", "Apply an academic foundation", "Create the reviewed planning session, term, provided classes, and selected Nigerian curriculum starter in one controlled run.", ["Enter the school-approved session, term, and class details.", "Review the bounded execution plan.", "Approve and run once."], ["Session and term dates", "Real class names", "Reviewed curriculum starter"], ["The job does not create learners, staff, invoices, payments, results, public content, or provider configuration."]);
  return choose("manual_review", "Review the next operational goal", "This goal needs an existing protected workspace or school-approved information that the Automation Desk cannot infer.", ["Review the available workspaces.", "Use the protected workflow that owns this decision."], ["Clarify the specific approved outcome"], ["No action will run automatically for this goal."]);
}

function validatePlan(value: unknown, fallback: AutomationPlan): AutomationPlan {
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Record<string, unknown>;
  const jobType = text(candidate.jobType, 48) as AutomationJobType;
  const title = text(candidate.title, 120);
  const summary = text(candidate.summary, 420);
  const steps = Array.isArray(candidate.steps) ? candidate.steps.map(item => text(item, 180)).filter(Boolean).slice(0, 4) : [];
  const missingFields = Array.isArray(candidate.missingFields) ? candidate.missingFields.map(item => text(item, 120)).filter(Boolean).slice(0, 4) : [];
  const limitations = Array.isArray(candidate.limitations) ? candidate.limitations.map(item => text(item, 220)).filter(Boolean).slice(0, 4) : [];
  if (!allowedTypes.includes(jobType) || !title || !summary || !steps.length || !limitations.length) return fallback;
  return { jobType, title, summary, steps, missingFields, limitations, source: "ai" };
}

export async function buildAutomationPlan(input: { request: string; assessment: ReadinessAssessment; operatingType: "school" | "vocational_institute" | "coaching_centre" | "online_training_provider" | "hybrid_learning_provider" }) {
  const fallback = fallbackPlan(input.request, input.assessment);
  const actionContext = input.assessment.actions.map(action => ({ id: action.id, state: action.state, executable: action.executable })).slice(0, 5);
  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 600,
      messages: [
        { role: "system", content: "You are NSOS Automation Desk planner. Classify a Nigerian school owner’s request into exactly one supplied internal job type. Return a concise plan only. You must not claim execution, infer school facts, request secrets, request payment data, request learner or guardian data, or produce public claims. Never recommend sending invitations, activating fees, publishing a website, connecting a domain, changing providers, creating accounts, enrolling learners, grading, completing a learner, or issuing a credential. Use online_school_launch only for an explicit full online-school or online-training launch request. That job creates a private draft-only learning foundation and configuration-readiness record in the existing institution; it never creates people, mock records, payments, messages, public content, a tutor account, or credentials. Staff jobs may prepare a private draft only. Finance jobs may prepare an inactive draft only. Course and website jobs require their dedicated editable review workspaces. Return only the requested JSON." },
        { role: "user", content: `Owner goal: ${input.request.trim().slice(0, 600)}\n\nTenant readiness: ${JSON.stringify({ completionPercent: input.assessment.completionPercent, actions: actionContext })}` },
      ],
      response_format: { type: "json_schema", json_schema: { name: "nsos_automation_plan", strict: true, schema: { type: "object", properties: { jobType: { type: "string", enum: allowedTypes }, title: { type: "string" }, summary: { type: "string" }, steps: { type: "array", minItems: 1, maxItems: 4, items: { type: "string" } }, missingFields: { type: "array", maxItems: 4, items: { type: "string" } }, limitations: { type: "array", minItems: 1, maxItems: 4, items: { type: "string" } } }, required: ["jobType", "title", "summary", "steps", "missingFields", "limitations"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message.content;
    const plan = validatePlan(typeof content === "string" ? JSON.parse(content) : null, fallback);
    if (plan.jobType !== "online_school_launch") return plan;
    const launchDraft = await buildCourseStudioDraft({ brief: input.request, audience: "Organisation to confirm intended learners", operatingType: input.operatingType, deliveryMode: "self_paced", durationPreference: "Owner to review" });
    return { ...plan, launchDraft };
  } catch {
    if (fallback.jobType !== "online_school_launch") return fallback;
    return { ...fallback, launchDraft: await buildCourseStudioDraft({ brief: input.request, audience: "Organisation to confirm intended learners", operatingType: input.operatingType, deliveryMode: "self_paced", durationPreference: "Owner to review" }) };
  }
}

export function jobCanRun(jobType: AutomationJobType) { return executableTypes.has(jobType); }

export function validateAutomationInput(jobType: AutomationJobType, raw: Record<string, unknown>): ValidAutomationInput {
  if (jobType === "academic_foundation") {
    const classes = Array.isArray(raw.classes) ? raw.classes.map(item => ({ name: text((item as Record<string, unknown>)?.name, 120), level: text((item as Record<string, unknown>)?.level, 64) || undefined })).filter(item => item.name.length >= 2).slice(0, 30) : [];
    const templateId = text(raw.templateId, 64) as AcademicAutomationInput["templateId"];
    if (!text(raw.sessionName, 64) || !text(raw.termName, 64) || !isDate(raw.sessionStartsOn) || !isDate(raw.sessionEndsOn) || !isDate(raw.termStartsOn) || !isDate(raw.termEndsOn) || !classes.length || !["basic_primary", "basic_junior_secondary", "senior_secondary_review"].includes(templateId)) throw new Error("Add the school-approved session, term, dates, real class names, and reviewed curriculum starter before this job can run.");
    return { sessionName: text(raw.sessionName, 64), sessionStartsOn: String(raw.sessionStartsOn), sessionEndsOn: String(raw.sessionEndsOn), termName: text(raw.termName, 64), termStartsOn: String(raw.termStartsOn), termEndsOn: String(raw.termEndsOn), classes, templateId, includeOptional: raw.includeOptional === true };
  }
  if (jobType === "staff_invitation_draft") {
    const role = text(raw.role, 16) as StaffAutomationInput["role"];
    const employmentType = text(raw.employmentType, 20) as StaffAutomationInput["employmentType"];
    if (!text(raw.firstName, 120) || !text(raw.lastName, 120) || !/^\S+@\S+\.\S+$/.test(text(raw.email, 320)) || !text(raw.employeeNo, 48) || !text(raw.jobTitle, 120) || !["admin", "staff", "teacher", "finance"].includes(role) || !["full_time", "part_time", "contract", "temporary"].includes(employmentType)) throw new Error("Add the school-approved staff identity, email, employee number, job title, role, and employment type before this private draft can run.");
    return { firstName: text(raw.firstName, 120), lastName: text(raw.lastName, 120), email: text(raw.email, 320), employeeNo: text(raw.employeeNo, 48), jobTitle: text(raw.jobTitle, 120), role, employmentType };
  }
  if (jobType === "finance_draft") {
    const amount = Number(raw.amount);
    if (!text(raw.name, 255) || !Number.isFinite(amount) || amount <= 0 || amount > 10_000_000 || (raw.dueOn !== undefined && raw.dueOn !== "" && !isDate(raw.dueOn))) throw new Error("Add a school-approved fee name, amount, and valid optional due date before this inactive draft can run.");
    const termId = Number(raw.termId);
    const classId = Number(raw.classId);
    return { name: text(raw.name, 255), amount, termId: Number.isInteger(termId) && termId > 0 ? termId : undefined, classId: Number.isInteger(classId) && classId > 0 ? classId : undefined, mandatory: raw.mandatory !== false, dueOn: isDate(raw.dueOn) ? String(raw.dueOn) : undefined };
  }
  throw new Error("This goal needs its dedicated review workspace before NSOS can run it.");
}
