import { describe, expect, it } from "vitest";

describe("authentication provider configuration", () => {
  it.runIf(process.env.RUN_EXTERNAL_INTEGRATION_TESTS === "true" && Boolean(process.env.RESEND_API_KEY))("validates the configured Resend API key without exposing it", async () => {
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    expect(response.ok).toBe(true);
  });
});
