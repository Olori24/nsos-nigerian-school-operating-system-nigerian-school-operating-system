import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enqueueWelcomeEmailDelivery: vi.fn(),
  claimWelcomeEmailDelivery: vi.fn(),
  markWelcomeEmailSent: vi.fn(),
  markWelcomeEmailFailed: vi.fn(),
  writeOperationalEvent: vi.fn(),
}));

vi.mock("./db", () => ({
  enqueueWelcomeEmailDelivery: mocks.enqueueWelcomeEmailDelivery,
  claimWelcomeEmailDelivery: mocks.claimWelcomeEmailDelivery,
  markWelcomeEmailSent: mocks.markWelcomeEmailSent,
  markWelcomeEmailFailed: mocks.markWelcomeEmailFailed,
}));
vi.mock("./observability", () => ({
  writeOperationalEvent: mocks.writeOperationalEvent,
}));

import {
  dispatchWelcomeEmailForNewAccount,
  welcomeEmailPolicies,
} from "./welcomeEmail";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.values(mocks).forEach(mock => mock.mockReset());
});

describe("welcome email delivery", () => {
  it("sends once with privacy-safe copy after claiming a queued delivery", async () => {
    mocks.enqueueWelcomeEmailDelivery.mockResolvedValue({
      id: 41,
      status: "queued",
      recipientEmail: "new.user@example.ng",
    });
    mocks.claimWelcomeEmailDelivery.mockResolvedValue({
      id: 41,
      status: "sending",
      recipientEmail: "new.user@example.ng",
    });
    mocks.markWelcomeEmailSent.mockResolvedValue(undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "re_accepted_41" }), { status: 200 })
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await dispatchWelcomeEmailForNewAccount({
      userId: 41,
      email: "new.user@example.ng",
      origin: "https://nsos.top",
    });

    expect(result).toEqual({
      status: "sent",
      providerMessageId: "re_accepted_41",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers).toEqual(
      expect.objectContaining({ "Idempotency-Key": "nsos-welcome-user-41" })
    );
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toEqual(
      expect.objectContaining({
        from: expect.any(String),
        to: "new.user@example.ng",
        subject: "Welcome to NSOS",
      })
    );
    expect(String(body.text)).not.toContain("password");
    expect(String(body.text)).not.toContain("credential");
    expect(String(body.html)).toContain("Welcome to NSOS");
    expect(String(body.html)).toContain("#0f5c4f");
    expect(String(body.html)).toContain('alt="NSOS logo"');
    expect(mocks.markWelcomeEmailSent).toHaveBeenCalledWith({
      deliveryId: 41,
      providerMessageId: "re_accepted_41",
    });
  });

  it("does not send again when the durable record is already sent", async () => {
    mocks.enqueueWelcomeEmailDelivery.mockResolvedValue({
      id: 41,
      status: "sent",
      recipientEmail: "new.user@example.ng",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await dispatchWelcomeEmailForNewAccount({
      userId: 41,
      email: "new.user@example.ng",
      origin: "https://nsos.top",
    });

    expect(result).toEqual({ status: "sent" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.claimWelcomeEmailDelivery).not.toHaveBeenCalled();
  });

  it("records provider failure without throwing into account creation", async () => {
    mocks.enqueueWelcomeEmailDelivery.mockResolvedValue({
      id: 42,
      status: "queued",
      recipientEmail: "new.user@example.ng",
    });
    mocks.claimWelcomeEmailDelivery.mockResolvedValue({
      id: 42,
      status: "sending",
      recipientEmail: "new.user@example.ng",
    });
    mocks.markWelcomeEmailFailed.mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "unavailable" }), {
          status: 503,
        })
      )
    );

    const result = await dispatchWelcomeEmailForNewAccount({
      userId: 42,
      email: "new.user@example.ng",
      origin: "https://nsos.top",
    });

    expect(result).toEqual({ status: "failed" });
    expect(mocks.markWelcomeEmailFailed).toHaveBeenCalledWith({
      deliveryId: 42,
      error: expect.any(Error),
    });
  });

  it("renders a branded template with a safe public logo and a text fallback", () => {
    const branded = welcomeEmailPolicies.buildWelcomeEmailContent({
      origin: "https://nsos.top",
      logoUrl: "https://cdn.example.ng/nsos-logo.png",
    });
    expect(branded.html).toContain(
      'src="https://cdn.example.ng/nsos-logo.png"'
    );
    expect(branded.html).toContain('alt="NSOS logo"');
    expect(branded.html).toContain("#123b31");
    expect(branded.html).toContain("Open NSOS");
    expect(branded.text).toContain("https://nsos.top/");

    const fallback = welcomeEmailPolicies.buildWelcomeEmailContent({
      origin: "https://nsos.top",
      logoUrl: "data:image/png;base64,not-a-public-asset",
    });
    expect(fallback.html).toContain('aria-label="NSOS"');
    expect(fallback.html).not.toContain("data:image");
    expect(
      welcomeEmailPolicies.safePublicImageUrl("http://cdn.example.ng/logo.png")
    ).toBeUndefined();
  });

  it("rejects unsafe sender and welcome destinations", () => {
    expect(
      welcomeEmailPolicies.normaliseSender("NSOS <notifications@nsos.top>")
    ).toBe("NSOS <notifications@nsos.top>");
    expect(() =>
      welcomeEmailPolicies.normaliseSender(
        "notifications@nsos.top\r\nBcc: attacker@example.com"
      )
    ).toThrow("not configured safely");
    expect(welcomeEmailPolicies.safeWelcomeOrigin("https://nsos.top")).toBe(
      "https://nsos.top"
    );
    expect(() =>
      welcomeEmailPolicies.safeWelcomeOrigin("https://nsos.top/unsafe")
    ).toThrow("not configured safely");
  });
});
