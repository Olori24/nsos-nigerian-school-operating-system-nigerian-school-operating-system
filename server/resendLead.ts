import { ENV } from "./_core/env";

const RESEND_EVENTS_URL = "https://api.resend.com/events/send";
const LEAD_EVENT = "nsos.lead.created";

export type NsosLeadEvent = {
  email: string;
  firstName?: string;
  schoolName?: string;
  leadSource?: string;
  consent: true;
};

export async function sendNsosLeadEvent(input: NsosLeadEvent) {
  if (!ENV.resendApiKey) {
    throw new Error("Lead email automation is not configured.");
  }

  const response = await fetch(RESEND_EVENTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event: LEAD_EVENT,
      email: input.email,
      payload: {
        first_name: input.firstName ?? "",
        school_name: input.schoolName ?? "",
        lead_source: input.leadSource ?? "nsos.top/start",
        consent: true,
      },
    }),
    signal: AbortSignal.timeout(8_000),
  });

  const payload = (await response.json().catch(() => null)) as {
    id?: string;
    message?: string;
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        payload?.error ||
        "Resend could not start the lead automation."
    );
  }

  return { eventId: payload?.id ?? null };
}
