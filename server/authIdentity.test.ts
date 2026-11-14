import { describe, expect, it } from "vitest";
import { requireUnambiguousVerifiedEmailAccount } from "./authIdentity";

describe("verified-email account recovery", () => {
  it("returns no account when the verified email is not registered", () => {
    expect(requireUnambiguousVerifiedEmailAccount([])).toBeUndefined();
  });

  it("returns the sole account matching a provider-verified email", () => {
    const account = { id: 17, openId: "legacy-account" };
    expect(requireUnambiguousVerifiedEmailAccount([account])).toBe(account);
  });

  it("fails closed when the same email is attached to multiple accounts", () => {
    expect(() => requireUnambiguousVerifiedEmailAccount([{ id: 17 }, { id: 18 }]))
      .toThrow("multiple NSOS accounts");
  });
});
