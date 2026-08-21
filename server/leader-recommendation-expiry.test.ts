import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers/nsos.ts"), "utf8");

describe("leader recommendation expiry safeguards", () => {
  it("clears expired recommendation fields before teacher and school-leader alert lists are read", () => {
    expect(dbSource).toContain("clearExpiredSchoolLeaderSchemeRecommendations");
    expect(dbSource).toContain("recommendationExpiresAt} <= ${now}");
    expect(dbSource).toContain("recommendationExpiresAt: null");
  });

  it("requires a future expiry at both the procedure and persistence boundaries", () => {
    expect(routerSource).toContain("Recommendation expiry must be in the future.");
    expect(dbSource).toContain("input.recommendationExpiresAt.getTime() <= Date.now()");
  });

  it("retains an expired, unacknowledged outcome separately from the live recommendation flag", () => {
    expect(dbSource).toContain("teacherSchemeRevisionRecommendationOutcomes");
    expect(dbSource).toContain("expiredAt: now");
    expect(dbSource).toContain("acknowledgedAt: new Date()");
    expect(dbSource).toContain("listExpiredBeforeAcknowledgementRecommendationReport");
  });
});
