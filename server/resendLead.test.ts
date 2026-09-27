import { afterEach, describe, expect, it, vi } from "vitest";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.resetModules();
});

describe("NSOS lead Resend event integration", () => {
  it("sends the lead-created event through Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_lead_key");
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ id: "evt_test_123" }), { status: 202, headers: { "Content-Type": "application/json" } }));
    globalThis.fetch = fetchMock;
    const { sendNsosLeadEvent } = await import("./resendLead");
    await expect(sendNsosLeadEvent({ email:"test@example.com", firstName:"NSOS Delivery Test", schoolName:"NSOS", leadSource:"nsos.top/start", consent:true })).resolves.toEqual({ eventId:"evt_test_123" });
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({
      event:"nsos.lead.created", email:"test@example.com",
      payload:{ first_name:"NSOS Delivery Test", school_name:"NSOS", lead_source:"nsos.top/start", consent:true }
    });
  });

  it("sends a high-intent event for an explicit walkthrough request", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_lead_key");
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ id: "evt_intent_123" }), { status: 202, headers: { "Content-Type": "application/json" } }));
    globalThis.fetch = fetchMock;
    const { sendNsosHighIntentEvent } = await import("./resendLead");
    await expect(sendNsosHighIntentEvent({ email:"test@example.com", action:"walkthrough_requested" })).resolves.toEqual({ eventId:"evt_intent_123" });
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({
      event:"nsos.lead.high_intent", email:"test@example.com",
      payload:{ intent_action:"walkthrough_requested", intent_source:"nsos.top/start" }
    });
  });
});
