import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const website = readFileSync(
  resolve(root, "client/src/pages/SchoolWebsite.tsx"),
  "utf8"
);
const studio = readFileSync(
  resolve(root, "client/src/components/WebsiteStudio.tsx"),
  "utf8"
);
const codingSpotlight = readFileSync(
  resolve(root, "client/src/components/CodingForBeginnersSection.tsx"),
  "utf8"
);

describe("school website live preview", () => {
  it("shares the public website layout with a dedicated draft-preview renderer", () => {
    expect(website).toContain("export function SchoolWebsitePreview");
    expect(website).toContain("function SchoolWebsiteLayout");
    expect(website).toContain("<SchoolWebsiteLayout");
    expect(website).toContain("preview");
    expect(website).toContain("highlightedSection={highlightedSection}");
    expect(website).toContain("Live draft preview — not yet public");
  });

  it("renders the current studio form as a clearly labelled, scrollable draft-safe preview", () => {
    expect(studio).toContain("SchoolWebsitePreview");
    expect(studio).toContain("type WebsitePreviewSection");
    expect(studio).toContain("@/pages/SchoolWebsite");
    expect(studio).toContain("Live website preview");
    expect(studio).toContain("Draft-safe preview");
    expect(studio).toContain("<SchoolWebsitePreview");
    expect(studio).toContain("website={form}");
    expect(studio).toContain("highlightedSection={previewHighlight}");
    expect(studio).toContain("max-h-[780px] overflow-y-auto");
  });

  it("renders the Coding for Beginners spotlight only in draft preview with readiness-safe copy", () => {
    expect(website).toContain(
      'import { CodingForBeginnersSection } from "@/components/CodingForBeginnersSection";'
    );
    expect(website).toContain("preview && (");
    expect(website).toContain("<CodingForBeginnersSection");
    expect(website).toContain('previewOutline("learning")');
    expect(codingSpotlight).toContain('data-preview-section="learning"');
    expect(codingSpotlight).toContain("4 Sep – 29 Oct 2026");
    expect(codingSpotlight).toContain(
      "Course access and invitations are confirmed"
    );
    expect(codingSpotlight).toContain("separately by the");
    expect(codingSpotlight).not.toContain("Send invitation");
    expect(codingSpotlight).not.toContain("payment received");
  });

  it("maps editable studio controls to accessible hover and focus highlights in the matching preview areas", () => {
    expect(studio).toContain('previewSection="hero"');
    expect(studio).toContain('previewSection="contact"');
    expect(studio).toContain('previewSection="location"');
    expect(studio).toContain('previewSection="brand"');
    expect(studio).toContain('previewSection="admissions"');
    expect(studio).toContain("onMouseEnter={showPreviewSection}");
    expect(studio).toContain("onFocusCapture={showPreviewSection}");
    expect(studio).toContain("highlightedSection={previewHighlight}");
    expect(studio).toContain(
      "Hover or focus an editable field to outline its matching preview area."
    );
    expect(website).toContain(
      "highlightedSection?: WebsitePreviewSection | null"
    );
    expect(website).toContain('data-preview-section="hero"');
    expect(website).toContain('data-preview-section="admissions"');
    expect(website).toContain('previewOutline("learning")');
    expect(studio).toContain("course spotlight is a draft-only preview");
    expect(website).toContain("ring-2 ring-[#e1a62d]");
  });
});
