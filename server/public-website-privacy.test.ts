import { describe, expect, it } from "vitest";
import { publicSchoolWebsitePayload } from "./db/core";

describe("public school website privacy serializer", () => {
  const school = {
    id: 42,
    name: "Greener Future Academy",
    shortCode: "GFA-001",
    operatingType: "school",
    email: "private-admin@example.com",
    phone: "08000000000",
    address: "Private staff address",
    state: "Oyo",
    logoUrl: "https://private.example/logo.png",
    currency: "NGN",
    timezone: "Africa/Lagos",
    createdBy: 7,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const website = {
    id: 99,
    schoolId: 42,
    headline: "Learning for a brighter future",
    introduction: "Welcome to our school.",
    primaryColor: "#0f5c4f",
    contactEmail: "hello@school.example",
    contactPhone: "08011111111",
    campusLocation: "Ibadan",
    customDomain: "school.example",
    domainVerificationToken: "secret-verification-token",
    domainStatus: "active",
    admissionsEnabled: true,
    logoMediaId: 10,
    heroMediaId: 11,
    visualTheme: "modern",
    websiteContent: {
      about: "A public introduction",
      principalName: "Public Principal",
      principalTitle: "Principal",
      principalMessage: "Welcome.",
      programmes: ["Primary"],
      faqs: [{ question: "When do admissions open?", answer: "See our admissions page." }],
      socialLinks: [{ label: "Facebook", url: "https://facebook.com/example" }],
    },
    published: true,
    updatedAt: new Date(),
  } as any;

  const payload = () => publicSchoolWebsitePayload(
    { school, website },
    { logoUrl: "https://cdn.example/logo.png", heroUrl: "https://cdn.example/hero.png" },
  );

  it("returns only explicitly public school identity", () => {
    expect(payload().school).toEqual({
      name: "Greener Future Academy",
      shortCode: "GFA-001",
      state: "Oyo",
    });
  });

  it("returns only explicitly public website fields", () => {
    expect(payload().website).toMatchObject({
      headline: website.headline,
      introduction: website.introduction,
      primaryColor: website.primaryColor,
      contactEmail: website.contactEmail,
      contactPhone: website.contactPhone,
      campusLocation: website.campusLocation,
      admissionsEnabled: true,
      visualTheme: "modern",
      websiteContent: website.websiteContent,
      logoUrl: "https://cdn.example/logo.png",
      heroUrl: "https://cdn.example/hero.png",
    });
    expect(Object.keys(payload().website)).toHaveLength(11);
  });

  it("never exposes tenant identifiers or domain verification data", () => {
    const serialized = JSON.stringify(payload());
    expect(serialized).not.toContain('"id"');
    expect(serialized).not.toContain('"schoolId"');
    expect(serialized).not.toContain('"customDomain"');
    expect(serialized).not.toContain('"domainVerificationToken"');
    expect(serialized).not.toContain('"domainStatus"');
  });

  it("never exposes internal school metadata", () => {
    const serialized = JSON.stringify(payload());
    expect(serialized).not.toContain('"operatingType"');
    expect(serialized).not.toContain('"createdBy"');
    expect(serialized).not.toContain('"currency"');
    expect(serialized).not.toContain('"timezone"');
    expect(serialized).not.toContain('"address"');
  });

  it("preserves the public admissions route without exposing the tenant id", () => {
    expect(payload().admissionsUrl).toBe("/apply/GFA-001");
  });
});
