import { describe, expect, it } from "vitest";
import { isActivePublishedDomain, isValidCustomDomain, matchesDomainVerificationRecord } from "./db";

describe("NSOS custom-domain service rules", () => {
  it("accepts valid host names and rejects paths, protocols, labels, and malformed domains", () => {
    expect(isValidCustomDomain("www.greenerfuture.edu.ng")).toBe(true);
    expect(isValidCustomDomain("portal.school.co.uk")).toBe(true);
    expect(isValidCustomDomain("https://school.edu.ng")).toBe(false);
    expect(isValidCustomDomain("school.edu.ng/apply")).toBe(false);
    expect(isValidCustomDomain("-school.edu.ng")).toBe(false);
    expect(isValidCustomDomain("school")).toBe(false);
  });

  it("matches only the exact DNS TXT verification token", () => {
    const token = "abc123";
    expect(matchesDomainVerificationRecord([["google-site-verification=other"], ["nsos-site-verification=abc123"]], token)).toBe(true);
    expect(matchesDomainVerificationRecord([["nsos-site-verification=wrong"]], token)).toBe(false);
  });

  it("serves a custom domain only when it is both active and published", () => {
    expect(isActivePublishedDomain({ domainStatus: "active", published: true })).toBe(true);
    expect(isActivePublishedDomain({ domainStatus: "pending", published: true })).toBe(false);
    expect(isActivePublishedDomain({ domainStatus: "active", published: false })).toBe(false);
  });
});
