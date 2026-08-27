import { describe, expect, it } from "vitest";

function senderDomain(value: string) {
  const address = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const domain = address?.split("@")[1]?.trim().toLowerCase();
  if (!domain) throw new Error("AUTH_EMAIL_FROM must contain a sender email address.");
  return domain;
}

const liveProviderTest = process.env.RUN_LIVE_PROVIDER_TESTS === "true" ? it : it.skip;

describe("configured email sender authorization", () => {
  it("extracts the email domain from standard display-name sender syntax", () => {
    expect(senderDomain("NSOS <notifications@nsos.top>")).toBe("nsos.top");
  });

  liveProviderTest("uses a verified Resend sender domain", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    const sender = process.env.AUTH_EMAIL_FROM;
    expect(apiKey, "RESEND_API_KEY is required for email delivery.").toBeTruthy();
    expect(sender, "AUTH_EMAIL_FROM is required for email delivery.").toBeTruthy();
    const response = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(12_000) });
    expect(response.ok, `Resend domains check failed with HTTP ${response.status}.`).toBe(true);
    const payload = await response.json() as {
      data?: Array<{
        id?: string;
        name?: string;
        status?: string;
        capabilities?: { sending?: string };
      }>;
    };
    const domain = senderDomain(sender!);
    const configured = payload.data?.find(item => item.name?.toLowerCase() === domain);
    expect(configured, `The configured sender domain ${domain} is not in the Resend account.`).toBeTruthy();
    expect(["verified", "partially_verified"], `The configured sender domain ${domain} is not verified for sending in Resend.`).toContain(configured?.status);
    expect(configured?.capabilities?.sending, `The configured sender domain ${domain} does not have Resend sending enabled.`).toBe("enabled");
    expect(configured?.id, `The configured sender domain ${domain} has no Resend domain ID.`).toBeTruthy();

    const detailsResponse = await fetch(`https://api.resend.com/domains/${configured!.id}`, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(12_000) });
    expect(detailsResponse.ok, `Resend domain details check failed with HTTP ${detailsResponse.status}.`).toBe(true);
    const details = await detailsResponse.json() as {
      records?: Array<{ record?: string; name?: string; type?: string; status?: string }>;
    };
    const requiredRecords = [
      { record: "DKIM", name: "resend._domainkey", type: "TXT" },
      { record: "SPF", name: "rsend", type: "MX" },
      { record: "SPF", name: "rsend", type: "TXT" },
    ];
    for (const required of requiredRecords) {
      const record = details.records?.find(item => item.record === required.record && item.name === required.name && item.type === required.type);
      expect(record, `Required Resend ${required.record} ${required.type} record ${required.name} is missing.`).toBeTruthy();
      expect(record?.status, `Required Resend ${required.record} ${required.type} record ${required.name} is not verified.`).toBe("verified");
    }
  }, 20_000);
});
