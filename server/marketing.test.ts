import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { marketingEmailPolicies } from "./marketingEmail";

const schema = readFileSync(
  new URL("../drizzle/schema/core.ts", import.meta.url),
  "utf8"
);
const router = readFileSync(
  new URL("./routers/nsos.ts", import.meta.url),
  "utf8"
);
const preferences = readFileSync(
  new URL(
    "../client/src/components/MarketingPreferencesPanel.tsx",
    import.meta.url
  ),
  "utf8"
);
const consoleSource = readFileSync(
  new URL(
    "../client/src/components/MarketingCampaignConsole.tsx",
    import.meta.url
  ),
  "utf8"
);
const auth = readFileSync(new URL("./auth.ts", import.meta.url), "utf8");

describe("Approach A marketing safeguards", () => {
  it("defaults users to unsubscribed and stores consent separately", () => {
    expect(schema).toContain("marketingSubscriptions");
    expect(schema).toContain('default("unsubscribed")');
    expect(schema).toContain("marketingConsentEvents");
    expect(router).toMatch(
      /source:\s*z\s*\.enum\(\[\s*"account_settings"\s*,\s*"registration"\s*,\s*"unsubscribe_link"/s
    );
    expect(router).toContain("setMarketingSubscription");
  });

  it("uses signed expiring unsubscribe tokens and rejects tampering", () => {
    const now = 1_800_000_000;
    const token = marketingEmailPolicies.createMarketingUnsubscribeToken(
      42,
      now
    );
    expect(
      marketingEmailPolicies.verifyMarketingUnsubscribeToken(token, now + 60)
    ).toBe(42);
    expect(
      marketingEmailPolicies.verifyMarketingUnsubscribeToken(
        `${token}x`,
        now + 60
      )
    ).toBeUndefined();
    expect(
      marketingEmailPolicies.verifyMarketingUnsubscribeToken(
        token,
        now + 60 * 60 * 24 * 181
      )
    ).toBeUndefined();
  });

  it("keeps preference changes user-scoped and campaign controls owner-only", () => {
    expect(preferences).toContain('source: "account_settings"');
    expect(preferences).toContain("Subscribe to updates");
    expect(preferences).toContain("Unsubscribe");
    expect(consoleSource).toContain("createCampaign");
    expect(consoleSource).toContain("approveCampaign");
    expect(consoleSource).toContain("Send to subscribers");
    expect(consoleSource).toContain("This cannot be undone");
    expect(router).toContain("campaigns: platformOwnerProcedure");
    expect(router).toContain("createCampaign: platformOwnerProcedure");
    expect(router).toContain("approveCampaign: platformOwnerProcedure");
    expect(router).toContain("sendCampaign: platformOwnerProcedure");
    expect(auth).toContain("/api/marketing/unsubscribe");
  });

  it("does not silently enroll users or add an in-process scheduler", () => {
    expect(router).not.toContain("subscribed: true");
    expect(auth).not.toContain(
      "setMarketingSubscription({ userId: ctx.user.id, subscribed: true"
    );
    expect(router).not.toContain("setInterval");
  });
});
