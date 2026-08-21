import { describe, expect, it } from "vitest";
import { normaliseReviewedSchemeRows, safeSchemeFileName } from "./schemeOfWork";

describe("approved scheme-of-work validation", () => {
  it("sorts reviewed rows and keeps structured objectives and resources", () => {
    expect(normaliseReviewedSchemeRows([{ weekNo: 2, topic: "Reading", objectives: "Identify main ideas", resources: "Reader" }, { weekNo: 1, topic: "Introduction" }])).toEqual([{ weekNo: 1, topic: "Introduction", objectives: undefined, resources: undefined }, { weekNo: 2, topic: "Reading", objectives: "Identify main ideas", resources: "Reader" }]);
  });

  it("rejects duplicate weeks, invalid weeks, and unsafe file names before persistence", () => {
    expect(() => normaliseReviewedSchemeRows([{ weekNo: 1, topic: "One" }, { weekNo: 1, topic: "Duplicate" }])).toThrow(/appears more than once/i);
    expect(() => normaliseReviewedSchemeRows([{ weekNo: 21, topic: "Outside term" }])).toThrow(/1 to 20/i);
    expect(() => safeSchemeFileName("scheme.pdf")).toThrow(/CSV or Excel/i);
    expect(safeSchemeFileName("First Term Scheme.xlsx")).toBe("First_Term_Scheme.xlsx");
  });
});
