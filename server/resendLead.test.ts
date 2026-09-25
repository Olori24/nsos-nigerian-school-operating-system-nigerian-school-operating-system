import { afterEach, describe, expect, it, vi } from "vitest";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.resetModules();
});

describe("NSOS lead Resend event integration", () => {
  it("sends a named lead event through Resend's event-send endpoint", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_lead_key");
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ id: "evt_test_123" }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        })
    );
    globalThis.fetch = fetchMock;

    const { sendNsosLeadEvent } = await import("./resendLead");
    await expect(
      sendNsosLeadEvent({
        email: "test@example.com",
        firstName: "NSOS Delivery Test",
        schoolName: "NSOS",
        leadSource: "nsos.top/start",
        consent: true,
      })
    ).resolves.toEqual({ eventId: "evt_test_123" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/events/send");
    expect(options?.method).toBe("POST");
    expect(JSON.parse(String(options?.body))).toEqual({
      event: "nsos.lead.created",
      email: "test@example.com",
      payload: {
        first_name: "NSOS Delivery Test",
        school_name: "NSOS",
        lead_source: "nsos.top/start",
        consent: true,
      },
    });
  });
});
