import { describe, expect, it } from "vitest";
import { buildExpiredRecommendationCsv } from "../client/src/lib/expiredRecommendationCsv";

describe("expired recommendation CSV export", () => {
  it("includes term-review headings, preserves commas and quotes, and blocks spreadsheet formula interpretation", () => {
    const csv = buildExpiredRecommendationCsv([{ recipientName: '=HYPERLINK("https://untrusted.example")', classLabel: "JSS 2, Blue", subjectLabel: 'Basic "Science"', termLabel: "First Term", expiresAt: new Date("2026-08-20T08:00:00Z"), expiredAt: new Date("2026-08-20T08:05:00Z") }]);
    expect(csv).toContain("Assigned teacher");
    expect(csv).toContain("\"'=HYPERLINK(\"\"https://untrusted.example\"\")\"");
    expect(csv).toContain('"JSS 2, Blue"');
    expect(csv).toContain('"Basic ""Science"""');
  });

  it("uses a UTF-8 BOM and CRLF-separated rows for spreadsheet-friendly downloads", () => {
    const csv = buildExpiredRecommendationCsv([]);
    expect(csv.startsWith("\ufeff")).toBe(true);
    expect(csv).toContain("\r\n");
  });
});
