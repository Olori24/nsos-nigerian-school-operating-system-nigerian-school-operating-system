import { describe, expect, it } from "vitest";

function senderDomain(value: string) {
  const address = value.match(/<\s*([^>\s]+)\s*>/)?.[1] ?? value.trim();
  const domain = address.split("@")[1]?.trim().toLowerCase();
  if (!domain) throw new Error("AUTH_EMAIL_FROM must contain a sender email address.");
  return domain;
}

describe("configured email sender authorization", () => {
  it("uses a verified Resend sender domain", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    const sender = process.env.AUTH_EMAIL_FROM;
    expect(apiKey, "RESEND_API_KEY is required for email delivery.").toBeTruthy();
    expect(sender, "AUTH_EMAIL_FROM is required for email delivery.").toBeTruthy();
    const response = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(12_000) });
    expect(response.ok, `Resend domains check failed with HTTP ${response.status}.`).toBe(true);
    const payload = await response.json() as { data?: Array<{ name?: string; status?: string }> };
    const domain = senderDomain(sender!);
    const configured = payload.data?.find(item => item.name?.toLowerCase() === domain);
    expect(configured, `The configured sender domain ${domain} is not in the Resend account.`).toBeTruthy();
    expect(configured?.status, `The configured sender domain ${domain} is not verified in Resend.`).toBe("verified");
  }, 20_000);
});
