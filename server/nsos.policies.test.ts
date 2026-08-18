import { describe, expect, it } from "vitest";
import { calculatePercentage, resolveGrade } from "./grade-calculations";
import { can } from "./roles";

describe("NSOS grade computation", () => {
  it("calculates percentages with two decimal places and resolves the matching grade", () => {
    const percentage = calculatePercentage(38, 50);
    expect(percentage).toBe(76);
    expect(resolveGrade(percentage, [
      { label: "A", minPercentage: 70, maxPercentage: 100, remark: "Excellent" },
      { label: "B", minPercentage: 60, maxPercentage: 69.99, remark: "Very good" },
    ])).toEqual({ grade: "A", remark: "Excellent" });
  });

  it("rejects an invalid assessment maximum", () => {
    expect(() => calculatePercentage(10, 0)).toThrow("Maximum score must be greater than zero.");
  });
});

describe("NSOS role policies", () => {
  it("permits finance staff to manage finance but not student records", () => {
    expect(can("finance", "finance.write")).toBe(true);
    expect(can("finance", "students.write")).toBe(false);
  });

  it("grants administrative roles broad management access", () => {
    expect(can("owner", "results.write")).toBe(true);
    expect(can("admin", "attendance.write")).toBe(true);
  });

  it("limits portal users to their own portal and communications surfaces", () => {
    expect(can("parent", "portal.read")).toBe(true);
    expect(can("student", "communications.read")).toBe(true);
    expect(can("parent", "finance.write")).toBe(false);
    expect(can("student", "results.write")).toBe(false);
  });

  it("allows teachers to own academic and results work but not financial actions", () => {
    expect(can("teacher", "academics.write")).toBe(true);
    expect(can("teacher", "results.write")).toBe(true);
    expect(can("teacher", "finance.write")).toBe(false);
  });
});
