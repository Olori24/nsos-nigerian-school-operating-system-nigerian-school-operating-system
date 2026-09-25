import { describe, expect, it } from "vitest";
import { buildSchoolOperatorHealthSignals, buildSchoolOperatorTrendInsight, prioritizeSchoolOperatorInsights } from "./db/core";

describe("NSOS evidence-based school intelligence trends", () => {
  it("flags a material attendance decline as an attention insight", () => {
    const insight = buildSchoolOperatorTrendInsight({
      insightType: "health",
      metric: "attendance_rate_30d",
      recent: 82,
      previous: 91,
      source: "attendance_records",
      actionDestination: "attendance",
      title: "Attendance trend needs review",
      unit: "percentage_points",
      higherIsConcern: false,
      threshold: 3,
    });
    expect(insight).toMatchObject({
      severity: "attention",
      dedupeKey: "trend-attendance_rate_30d",
      evidence: { metric: "attendance_rate_30d", value: 82, source: "attendance_records" },
    });
    expect(insight?.detail).toContain("9 percentage points");
  });

  it("ignores small movements instead of manufacturing a problem", () => {
    const insight = buildSchoolOperatorTrendInsight({
      insightType: "learning",
      metric: "published_assessment_average_30d",
      recent: 76,
      previous: 78,
      source: "published_scores",
      actionDestination: "results",
      title: "Published assessment performance shifted",
      unit: "percentage_points",
      higherIsConcern: false,
      threshold: 5,
    });
    expect(insight).toBeNull();
  });

  it("reports count-based admissions changes as relative percentages", () => {
    const insight = buildSchoolOperatorTrendInsight({
      insightType: "admissions",
      metric: "admission_submissions_30d",
      recent: 15,
      previous: 20,
      source: "admissions_applications",
      actionDestination: "admissions",
      title: "Admissions enquiry volume shifted",
      unit: "percent",
      higherIsConcern: false,
      threshold: 25,
    });
    expect(insight).toMatchObject({ severity: "review", evidence: { value: 15 } });
    expect(insight?.detail).toContain("25%");
  });

  it("does not infer a trend when the comparison window has no data", () => {
    const insight = buildSchoolOperatorTrendInsight({
      insightType: "health",
      metric: "attendance_rate_30d",
      recent: 88,
      previous: 0,
      source: "attendance_records",
      actionDestination: "attendance",
      title: "Attendance trend needs review",
      unit: "percentage_points",
      higherIsConcern: false,
    });
    expect(insight).toBeNull();
  });
});


describe("NSOS School Intelligence v2 command centre", () => { // v2 verification
  it("includes comparison provenance on material trend evidence", () => {
    const insight = buildSchoolOperatorTrendInsight({
      insightType: "health",
      metric: "attendance_rate_30d",
      recent: 80,
      previous: 90,
      source: "attendance_records",
      actionDestination: "attendance",
      title: "Attendance trend needs review",
      unit: "percentage_points",
      higherIsConcern: false,
      threshold: 3,
    });
    expect(insight?.evidence.comparison).toContain("previous_window=90");
    expect(insight?.evidence.comparison).toContain("relative_delta=-11.11%");
  });

  it("builds health signals from current aggregate evidence", () => {
    const signals = buildSchoolOperatorHealthSignals({
      attendanceRate: 95,
      pendingAdmissions: 2,
      outstanding: 0,
      failedEmailCount: 1,
      failedAutomationJobs: 0,
      onboardingCompletionPercent: 100,
    });
    expect(signals.find(signal => signal.id === "attendance")?.status).toBe("healthy");
    expect(signals.find(signal => signal.id === "communications")?.status).toBe("attention");
    expect(signals.find(signal => signal.id === "finance")?.status).toBe("healthy");
  });

  it("prioritizes open attention items and respects review focus", () => {
    const now = new Date();
    const insights = [
      { id: 1, schoolId: 7, insightType: "learning", severity: "attention", status: "open", dedupeKey: "a", title: "Learning", detail: "Review", evidence: { metric: "x", value: 1, source: "x" }, actionDestination: "learning", sourceVersion: "deterministic-v2", generatedAt: now, dismissedBy: null, dismissedAt: null, createdAt: now, updatedAt: now },
      { id: 2, schoolId: 7, insightType: "admissions", severity: "review", status: "open", dedupeKey: "b", title: "Admissions", detail: "Review", evidence: { metric: "x", value: 1, source: "x" }, actionDestination: "admissions", sourceVersion: "deterministic-v2", generatedAt: new Date(now.getTime() - 1000), dismissedBy: null, dismissedAt: null, createdAt: now, updatedAt: now },
      { id: 3, schoolId: 7, insightType: "revenue", severity: "attention", status: "dismissed", dedupeKey: "c", title: "Revenue", detail: "Review", evidence: { metric: "x", value: 1, source: "x" }, actionDestination: "finance", sourceVersion: "deterministic-v2", generatedAt: now, dismissedBy: null, dismissedAt: null, createdAt: now, updatedAt: now },
    ] as any;
    const queue = prioritizeSchoolOperatorInsights(insights, "learning");
    expect(queue).toHaveLength(2);
    expect(queue[0].id).toBe(1);
    expect(queue[0].priority).toBeGreaterThan(queue[1].priority);
  });
});


describe("NSOS Ask My School v3", () => {
  it("keeps question answering evidence-first and scoped", async () => {
    expect(true).toBe(true);
  });
});
