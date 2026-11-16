import { describe, expect, it } from "vitest";
import { inspectProviderCredentialState } from "./db/core";

describe("provider credential readiness", () => {
  it("fails closed when stored credentials cannot be decrypted", () => {
    expect(inspectProviderCredentialState("not-a-valid-payload")).toEqual({
      hasCredentials: false,
      hasWebhookSecret: false,
      credentialsReadable: false,
    });
  });

  it("reports an absent credential bundle without treating it as a decryption failure", () => {
    expect(inspectProviderCredentialState(null)).toEqual({
      hasCredentials: false,
      hasWebhookSecret: false,
      credentialsReadable: true,
    });
  });
});
