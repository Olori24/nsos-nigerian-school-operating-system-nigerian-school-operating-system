import { describe, expect, it } from "vitest";
import { providerReadiness, providerRequiresCredentials, providerTestRequest } from "./db";

describe("NSOS provider configuration rules", () => {
  it("requires secrets for external providers but not internal/manual workflows", () => {
    expect(providerRequiresCredentials("paystack")).toBe(true);
    expect(providerRequiresCredentials("termii")).toBe(true);
    expect(providerRequiresCredentials("manual")).toBe(false);
    expect(providerRequiresCredentials("in_app")).toBe(false);
  });

  it("does not describe an external provider as ready without credentials", () => {
    expect(providerReadiness("payment", "paystack", false, "ready")).toBe("Credentials required");
    expect(providerReadiness("notification", "in_app", false, "ready")).toBe("Ready for notification adapter");
    expect(providerReadiness("payment", "flutterwave", true, "disabled")).toBe("Disabled");
  });

  it("uses non-transactional verification requests and does not test internal providers externally", () => {
    expect(providerTestRequest("paystack", { secretKey: "sk_test" })).toMatchObject({ url: "https://api.paystack.co/bank?perPage=1", init: { headers: { Authorization: "Bearer sk_test" } } });
    expect(providerTestRequest("stripe", { secretKey: "sk_test" })).toMatchObject({ url: "https://api.stripe.com/v1/balance" });
    expect(providerTestRequest("manual", {})).toBeNull();
    expect(providerTestRequest("in_app", {})).toBeNull();
  });

  it("refuses an external connection test when no credentials have been retained", () => {
    expect(() => providerTestRequest("termii", {})).toThrow("Store provider credentials");
  });
});
