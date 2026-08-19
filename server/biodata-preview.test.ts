import { describe, expect, it } from "vitest";
import { biodataPdfFilename, completedBiodataFields } from "../client/src/lib/biodataPdf";

describe("biodata preview export", () => {
  it("includes only completed values in the preview and PDF payload", () => {
    expect(completedBiodataFields([{ label: "First name", value: " Ada " }, { label: "State of origin", value: "" }, { label: "Guardian phone", value: undefined }])).toEqual([{ label: "First name", value: "Ada" }]);
  });

  it("creates a download-safe, Nigeria-first PDF filename", () => {
    expect(biodataPdfFilename("Greener Future Academy: Admission Biodata")).toMatch(/^greener-future-academy-admission-biodata-\d{4}-\d{2}-\d{2}\.pdf$/);
  });
});
