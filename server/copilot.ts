import { invokeLLM } from "./_core/llm";
import type { SchoolRole } from "./roles";

export type CopilotDestinationId = "overview" | "institution-builder" | "school-operator" | "admissions" | "students" | "academics" | "attendance" | "results" | "finance" | "staff" | "learning" | "portal" | "communications" | "reports" | "website" | "account";

export type CopilotDestination = {
  id: CopilotDestinationId;
  label: string;
  description: string;
  roles: readonly SchoolRole[];
  keywords: readonly string[];
};

export const copilotDestinations: readonly CopilotDestination[] = [
  { id: "overview", label: "Overview", description: "See the school’s key operating picture.", roles: ["owner", "admin", "staff", "teacher", "finance", "parent", "student"], keywords: ["overview", "dashboard", "start", "home", "summary"] },
  { id: "institution-builder", label: "School Builder", description: "Describe, refine, and review a private institution blueprint before separately approving any operational work.", roles: ["owner", "admin"], keywords: ["institution", "build", "builder", "academy", "launch", "template", "blueprint", "refine"] },
  { id: "school-operator", label: "School Operator", description: "Review private, explainable institution readiness, learning, revenue, admissions, and system-health signals before opening a protected workflow.", roles: ["owner", "admin"], keywords: ["operator", "attention", "health", "why", "dropout", "drop off", "performance", "inactive", "readiness", "what needs", "problem", "opportunity"] },
  { id: "admissions", label: "Admissions", description: "Review applications, documents, decisions, and enrollment.", roles: ["owner", "admin", "staff"], keywords: ["admission", "application", "applicant", "enrol", "enroll"] },
  { id: "students", label: "Students", description: "Manage learner records, guardians, and academic history.", roles: ["owner", "admin", "staff", "teacher"], keywords: ["student", "learner", "guardian", "promotion", "graduate"] },
  { id: "academics", label: "Academics", description: "Set up sessions, terms, classes, subjects, and learning plans.", roles: ["owner", "admin", "teacher"], keywords: ["academic", "class", "subject", "term", "timetable", "curriculum"] },
  { id: "attendance", label: "Attendance", description: "Record attendance and review absence patterns.", roles: ["owner", "admin", "staff", "teacher"], keywords: ["attendance", "present", "absent", "late"] },
  { id: "results", label: "Results", description: "Enter, approve, publish, and view assessment results.", roles: ["owner", "admin", "teacher"], keywords: ["result", "score", "assessment", "exam", "grade"] },
  { id: "finance", label: "Finance", description: "Work with fee structures, invoices, payments, and balances.", roles: ["owner", "admin", "finance"], keywords: ["fee", "finance", "invoice", "payment", "receipt", "balance"] },
  { id: "staff", label: "Staff & HR", description: "Manage staff profiles, duties, leave, payroll, and departments.", roles: ["owner", "admin", "staff"], keywords: ["staff", "teacher", "payroll", "leave", "department", "duty"] },
  { id: "learning", label: "Programmes", description: "Manage approved internal programmes, cohorts, instructors, learner enrolment, and human-confirmed completion.", roles: ["owner", "admin"], keywords: ["programme", "program", "cohort", "course", "training", "vocational", "coaching", "bootcamp", "instructor", "facilitator", "completion"] },
  { id: "portal", label: "Family portal", description: "View linked family information, fees, results, and updates.", roles: ["parent", "student"], keywords: ["my child", "my ward", "my result", "my fee", "family", "portal"] },
  { id: "communications", label: "Communications", description: "Read school updates and manage permitted announcements.", roles: ["owner", "admin", "staff", "teacher", "finance", "parent", "student"], keywords: ["message", "announcement", "notice", "communication", "update"] },
  { id: "reports", label: "Reports", description: "Review leadership and finance reporting.", roles: ["owner", "admin", "finance"], keywords: ["report", "analytics", "export", "revenue"] },
  { id: "website", label: "School website", description: "Manage public website, admissions entry point, and domain readiness.", roles: ["owner", "admin"], keywords: ["website", "domain", "public site", "branding"] },
  { id: "account", label: "Account & security", description: "Manage signed-in devices and account security.", roles: ["owner", "admin", "staff", "teacher", "finance", "parent", "student"], keywords: ["account", "security", "device", "session", "sign out", "login"] },
];

export function destinationsForRole(role: SchoolRole) {
  return copilotDestinations.filter(destination => destination.roles.includes(role));
}

type CopilotResponse = {
  reply: string;
  destination: CopilotDestinationId | null;
  suggestions: string[];
  source: "ai" | "guided";
};

function fallbackNavigation(message: string, destinations: readonly CopilotDestination[]): CopilotResponse {
  const normalized = message.toLocaleLowerCase("en-NG");
  const destination = destinations.find(item => item.keywords.some(keyword => normalized.includes(keyword))) ?? destinations.find(item => item.id === "overview") ?? destinations[0];
  if (!destination) return { reply: "You do not have a school workspace available yet. Please contact your school administrator or create a school workspace.", destination: null, suggestions: [], source: "guided" };
  return {
    reply: `Open ${destination.label} to ${destination.description.charAt(0).toLocaleLowerCase("en-NG")}${destination.description.slice(1)}`,
    destination: destination.id,
    suggestions: destinations.filter(item => item.id !== destination.id).slice(0, 3).map(item => item.label),
    source: "guided",
  };
}

function validResponse(value: unknown, destinations: readonly CopilotDestination[]): CopilotResponse | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const allowed = new Set(destinations.map(item => item.id));
  const destination = typeof candidate.destinationId === "string" && allowed.has(candidate.destinationId as CopilotDestinationId) ? candidate.destinationId as CopilotDestinationId : null;
  const reply = typeof candidate.reply === "string" ? candidate.reply.trim().slice(0, 600) : "";
  const suggestions = Array.isArray(candidate.suggestions) ? candidate.suggestions.filter((item): item is string => typeof item === "string").map(item => item.trim().slice(0, 80)).filter(Boolean).slice(0, 3) : [];
  return reply && destination ? { reply, destination, suggestions, source: "ai" } : null;
}

export async function getCopilotGuidance(input: { role: SchoolRole; message: string }) {
  const destinations = destinationsForRole(input.role);
  const fallback = fallbackNavigation(input.message, destinations);
  try {
    const allowedDestinations = destinations.map(item => ({ id: item.id, label: item.label, description: item.description }));
    const result = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 360,
      messages: [
        { role: "system", content: `You are NSOS Copilot, a concise navigation helper. You can ONLY guide the signed-in user to one of the supplied destinations. Do not claim to perform actions, access data, change settings, approve payments, or bypass role permissions. Do not ask for passwords, session tokens, bank details, learner details, or other personal information. If the request is outside navigation, briefly explain the limitation and choose the closest allowed destination. Allowed destinations: ${JSON.stringify(allowedDestinations)}` },
        { role: "user", content: input.message },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "nsos_navigation_guidance",
          strict: true,
          schema: {
            type: "object",
            properties: {
              reply: { type: "string" },
              destinationId: { type: "string", enum: destinations.map(item => item.id) },
              suggestions: { type: "array", items: { type: "string" }, maxItems: 3 },
            },
            required: ["reply", "destinationId", "suggestions"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = result.choices[0]?.message.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : null;
    return validResponse(parsed, destinations) ?? fallback;
  } catch {
    return fallback;
  }
}
