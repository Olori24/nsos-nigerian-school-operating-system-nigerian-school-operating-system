import { describe, expect, it } from "vitest";
import { buildSchoolOperatorTrendInsight } from "./db/core";

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
