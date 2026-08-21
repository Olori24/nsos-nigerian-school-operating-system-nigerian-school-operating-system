import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const controls = readFileSync(resolve(root, "client/src/components/SchemeRevisionPriorityControls.tsx"), "utf8");

describe("expired recommendation leadership report UI", () => {
  it("uses the management report contract and distinguishes an operational follow-up signal from a performance score", () => {
    expect(controls).toContain("expiredSchemeRevisionRecommendationReport.useQuery");
    expect(controls).toContain("Expired before acknowledgement");
    expect(controls).toContain("not a teacher performance score");
  });

  it("shows teacher, plan, expiry, and recorded outcome fields with a safe empty state", () => {
    expect(controls).toContain("Assigned teacher");
    expect(controls).toContain("No leader recommendations have expired before acknowledgement for this school.");
    expect(controls).toContain("Auto-clears");
  });

  it("offers a disabled-until-ready CSV download from the same management-scoped report data", () => {
    expect(controls).toContain("Download CSV for term review");
    expect(controls).toContain("buildExpiredRecommendationCsv(rows)");
    expect(controls).toContain("expiredSchemeRevisionRecommendationReport.useQuery");
  });
});
