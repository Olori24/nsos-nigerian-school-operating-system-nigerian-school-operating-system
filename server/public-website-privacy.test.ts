import { describe, expect, it } from "vitest";
import { publicWebsitePayload } from "./db";

describe("public website privacy boundary", () => {
  it("returns only approved public school and website fields", () => {
    const payload = publicWebsitePayload(
      {
        school: {
          id: 9,
          name: "Example School",
          shortCode: "EXAMPLE",
          operatingType: "school",
          email: "internal@example.ng",
          phone: "+2340000000000",
          address: "Private address",
          state: "Ogun",
          logoUrl: "private-logo-url",
          currency: "NGN",
          timezone: "Africa/Lagos",
          createdBy: 44,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        website: {
          id: 10,
          schoolId: 9,
          headline: "Learning with purpose",
          introduction: "A public introduction.",
          primaryColor: "#0f5c4f",
          contactEmail: "public@example.ng",
          contactPhone: "+2341111111111",
          campusLocation: "Ogun",
          customDomain: "example.ng",
          domainVerificationToken: "do-not-return",
          domainStatus: "active",
          admissionsEnabled: true,
          logoMediaId: 20,
          heroMediaId: 21,
          visualTheme: "academic",
          published: true,
          updatedAt: new Date(),
        },
      } as any,
      { logoUrl: "/logo.png", heroUrl: "/hero.png" }
    );

    expect(payload).toEqual({
      school: {
        name: "Example School",
        shortCode: "EXAMPLE",
        operatingType: "school",
        state: "Ogun",
      },
      website: {
        headline: "Learning with purpose",
        introduction: "A public introduction.",
        primaryColor: "#0f5c4f",
        contactEmail: "public@example.ng",
        contactPhone: "+2341111111111",
        campusLocation: "Ogun",
        admissionsEnabled: true,
        visualTheme: "academic",
        logoUrl: "/logo.png",
        heroUrl: "/hero.png",
      },
      admissionsUrl: "/apply/EXAMPLE",
    });
    expect(JSON.stringify(payload)).not.toContain("domainVerificationToken");
    expect(JSON.stringify(payload)).not.toContain("do-not-return");
    expect(JSON.stringify(payload)).not.toContain("createdBy");
    expect(JSON.stringify(payload)).not.toContain("internal@example.ng");
  });
});
