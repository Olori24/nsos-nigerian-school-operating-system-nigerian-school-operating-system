import { describe, expect, it } from "vitest";
import { authRoutePolicies } from "./auth";

describe("protected student-record sender readiness policy", () => {
  const verifiedRecords = [
    { record: "DKIM", name: "resend._domainkey", type: "TXT", status: "verified" },
    { record: "SPF", name: "rsend", type: "MX", status: "verified" },
    { record: "SPF", name: "rsend", type: "TXT", status: "verified" },
  ];

  it("accepts a fully verified sending domain", () => {
    expect(authRoutePolicies.hasVerifiedResendOutboundSending({ status: "verified", capabilities: { sending: "enabled" } })).toBe(true);
  });

  it("accepts Resend's sending-only partial state only when every required outbound record is verified", () => {
    expect(authRoutePolicies.hasVerifiedResendOutboundSending({ status: "partially_verified", capabilities: { sending: "enabled" }, records: verifiedRecords })).toBe(true);
    expect(authRoutePolicies.hasVerifiedResendOutboundSending({ status: "partially_verified", capabilities: { sending: "enabled" }, records: verifiedRecords.slice(0, 2) })).toBe(false);
  });

  it("rejects receiving-only, pending, or disabled-sending states", () => {
    expect(authRoutePolicies.hasVerifiedResendOutboundSending({ status: "partially_verified", capabilities: { sending: "disabled" }, records: verifiedRecords })).toBe(false);
    expect(authRoutePolicies.hasVerifiedResendOutboundSending({ status: "pending", capabilities: { sending: "enabled" }, records: verifiedRecords })).toBe(false);
  });
});
