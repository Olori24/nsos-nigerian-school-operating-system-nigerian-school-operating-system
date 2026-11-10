import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./env", () => ({
  ENV: {
    resendApiKey: "resend-test-key",
    authEmailFrom: "NSOS <alerts@nsos.top>",
    ownerNotificationEmail: "owner@example.test",
  },
}));

import { ENV } from "./env";
import { notifyOwner } from "./notification";

describe("owner notification delivery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
  });

  it("sends a plain-text owner email through the independent Resend API", async () => {
    await expect(notifyOwner({ title: "NSOS alert", content: "A school setup needs review." })).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ authorization: "Bearer resend-test-key" }),
      body: JSON.stringify({
        from: "NSOS <alerts@nsos.top>",
        to: ["owner@example.test"],
        subject: "NSOS alert",
        text: "A school setup needs review.",
      }),
    }));
  });

  it("returns false when optional owner notification settings are absent", async () => {
    ENV.ownerNotificationEmail = "";
    await expect(notifyOwner({ title: "NSOS alert", content: "Test." })).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns false when Resend rejects the request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
    await expect(notifyOwner({ title: "NSOS alert", content: "Test." })).resolves.toBe(false);
  });
});
