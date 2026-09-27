import { ENV } from "./_core/env";

const RESEND_EVENTS_URL = "https://api.resend.com/events/send";
const LEAD_EVENT = "nsos.lead.created";
const HIGH_INTENT_EVENT = "nsos.lead.high_intent";
const SCHOOL_SETUP_STARTED_EVENT = "nsos.school.setup_started";
const SCHOOL_ACTIVATED_EVENT = "nsos.school.activated";

type NsosEventInput = { email: string; payload?: Record<string, unknown> };

async function sendNsosEvent(event: string, input: NsosEventInput) {
  if (!ENV.resendApiKey) throw new Error("Lead email automation is not configured.");
  const response = await fetch(RESEND_EVENTS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ event, email: input.email, payload: input.payload ?? {} }),
    signal: AbortSignal.timeout(8_000),
  });
  const payload = (await response.json().catch(() => null)) as { id?: string; message?: string; error?: string } | null;
  if (!response.ok) throw new Error(payload?.message || payload?.error || "Resend could not start the lead automation.");
  return { eventId: payload?.id ?? null };
}

export type NsosLeadEvent = {
  email: string; firstName?: string; schoolName?: string; leadSource?: string; consent: true;
};

export async function sendNsosLeadEvent(input: NsosLeadEvent) {
  return sendNsosEvent(LEAD_EVENT, {
    email: input.email,
    payload: {
      first_name: input.firstName ?? "",
      school_name: input.schoolName ?? "",
      lead_source: input.leadSource ?? "nsos.top/start",
      consent: true,
    },
  });
}

export type NsosHighIntentEvent = {
  email: string;
  action: "walkthrough_requested";
  source?: string;
};

export async function sendNsosHighIntentEvent(input: NsosHighIntentEvent) {
  return sendNsosEvent(HIGH_INTENT_EVENT, {
    email: input.email,
    payload: {
      intent_action: input.action,
      intent_source: input.source ?? "nsos.top/start",
    },
  });
}
export type NsosSchoolLifecycleEvent = {
  email: string;
  firstName?: string;
  schoolName: string;
  schoolId: number;
};

export async function sendNsosSchoolSetupStartedEvent(input: NsosSchoolLifecycleEvent) {
  return sendNsosEvent(SCHOOL_SETUP_STARTED_EVENT, {
    email: input.email,
    payload: {
      first_name: input.firstName ?? "",
      school_name: input.schoolName,
      school_id: input.schoolId,
    },
  });
}

export async function sendNsosSchoolActivatedEvent(input: NsosSchoolLifecycleEvent) {
  return sendNsosEvent(SCHOOL_ACTIVATED_EVENT, {
    email: input.email,
    payload: {
      first_name: input.firstName ?? "",
      school_name: input.schoolName,
      school_id: input.schoolId,
    },
  });
}
