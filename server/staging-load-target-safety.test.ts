import { describe, expect, it } from "vitest";
import { boundedInteger, safeStagingHealthTarget } from "../scripts/loadTargetSafety.mjs";

describe("staging load-test target safety", () => {
  it("fails closed without explicit approval and never defaults to production", () => {
    expect(() => safeStagingHealthTarget({ approved: undefined, baseUrl: undefined })).toThrow(/approved isolated staging/i);
    expect(() => safeStagingHealthTarget({ approved: "true", baseUrl: "https://nsos-system-uhkdscaf.manus.space" })).toThrow(/refuses the live NSOS host/i);
    expect(() => safeStagingHealthTarget({ approved: "true", baseUrl: "https://nsos.example.com" })).toThrow(/staging.test.sandbox hostname/i);
  });

  it("allows only an explicitly approved HTTPS staging hostname and bounds workload controls", () => {
    expect(safeStagingHealthTarget({ approved: "true", baseUrl: "https://staging.nsos.example.com/anything" }).toString()).toBe("https://staging.nsos.example.com/api/trpc/system.health");
    expect(boundedInteger("999", 50, 200)).toBe(200);
    expect(boundedInteger("not-a-number", 50, 200)).toBe(50);
  });
});
