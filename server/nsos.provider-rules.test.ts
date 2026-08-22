import { describe, expect, it } from "vitest";
import { canApplySmsDeliveryTransition, getSmsDeliveryWebhookUrls, mapTermiiSmsDeliveryStatus, mapTwilioSmsDeliveryStatus, maskSmsRecipient, normaliseSmsRecipient, providerReadiness, providerRequiresCredentials, providerTestRequest, verifyTermiiWebhookSignature, verifyTwilioWebhookSignature } from "./db";
import { createHmac } from "node:crypto";

describe("NSOS provider configuration rules", () => {
  it("requires secrets for external providers but not internal/manual workflows", () => {
    expect(providerRequiresCredentials("paystack")).toBe(true);
    expect(providerRequiresCredentials("termii")).toBe(true);
    expect(providerRequiresCredentials("manual")).toBe(false);
    expect(providerRequiresCredentials("in_app")).toBe(false);
  });

  it("does not describe an external provider as ready without credentials and keeps internal in-app delivery credential-free", () => {
    expect(providerReadiness("payment", "paystack", false, "ready")).toBe("Credentials required");
    expect(providerReadiness("in_app", "in_app", false, "ready")).toBe("Ready for in-app messages");
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

  it("normalizes Nigerian phone numbers and never returns raw numbers in display-facing audit values", () => {
    expect(normaliseSmsRecipient("0803 123 4567")).toBe("2348031234567");
    expect(normaliseSmsRecipient("+234 803 123 4567")).toBe("2348031234567");
    expect(maskSmsRecipient("2348031234567")).toBe("2348••••567");
    expect(() => normaliseSmsRecipient("not-a-number")).toThrow("Enter a valid mobile number");
  });

  it("validates Termii raw-payload signatures and maps terminal delivery events", () => {
    const payload = JSON.stringify({ message_id: "termii-42", status: "Delivered" });
    const signature = createHmac("sha512", "termii-webhook-secret").update(payload).digest("hex");
    expect(verifyTermiiWebhookSignature(payload, signature, "termii-webhook-secret")).toBe(true);
    expect(verifyTermiiWebhookSignature(payload, "invalid", "termii-webhook-secret")).toBe(false);
    expect(mapTermiiSmsDeliveryStatus("Delivered")).toBe("delivered");
    expect(mapTermiiSmsDeliveryStatus("Rejected")).toBe("failed");
    expect(mapTermiiSmsDeliveryStatus("Message Sent")).toBe("pending");
  });

  it("validates Twilio signed callback fields and preserves terminal message outcomes", () => {
    const callbackUrl = getSmsDeliveryWebhookUrls(17).twilio;
    const formFields = { MessageSid: "SM42", MessageStatus: "delivered", ErrorCode: "" };
    const payload = `${callbackUrl}ErrorCodeMessageSidSM42MessageStatusdelivered`;
    const signature = createHmac("sha1", "twilio-auth-token").update(payload).digest("base64");
    expect(verifyTwilioWebhookSignature({ callbackUrl, formFields, signature, authToken: "twilio-auth-token" })).toBe(true);
    expect(verifyTwilioWebhookSignature({ callbackUrl, formFields, signature: "invalid", authToken: "twilio-auth-token" })).toBe(false);
    expect(mapTwilioSmsDeliveryStatus("undelivered")).toBe("failed");
    expect(mapTwilioSmsDeliveryStatus("queued")).toBe("pending");
    expect(canApplySmsDeliveryTransition("queued", "delivered")).toBe(true);
    expect(canApplySmsDeliveryTransition("sent", "failed")).toBe(false);
    expect(canApplySmsDeliveryTransition("failed", "delivered")).toBe(false);
  });
});
