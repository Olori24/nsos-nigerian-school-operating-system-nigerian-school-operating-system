import { describe, expect, it } from "vitest";
import { providerReadiness, providerRequiresCredentials } from "./db";

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
});
