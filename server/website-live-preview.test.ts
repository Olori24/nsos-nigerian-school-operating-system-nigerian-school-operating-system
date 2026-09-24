import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const website = readFileSync(resolve(root, "client/src/pages/SchoolWebsite.tsx"), "utf8");
const studio = readFileSync(resolve(root, "client/src/components/WebsiteStudio.tsx"), "utf8");

describe("school website live preview", () => {
  it("shares the public website layout with a dedicated draft-preview renderer", () => {
    expect(website).toContain("export function SchoolWebsitePreview");
    expect(website).toContain("function SchoolWebsiteLayout");
    expect(website).toContain("<SchoolWebsiteLayout site={site} preview highlightedSection={highlightedSection} />");
    expect(website).toContain("Live draft preview — not yet public");
  });

  it("renders the current studio form as a clearly labelled, scrollable draft-safe preview", () => {
    expect(studio).toContain('import { SchoolWebsitePreview, type WebsitePreviewSection } from "@/pages/SchoolWebsite"');
    expect(studio).toContain("Live website preview");
    expect(studio).toContain("Draft-safe preview");
    expect(studio).toContain("<SchoolWebsitePreview school={config.data.school} website={form} admissionsEnabled={form.admissionsEnabled} highlightedSection={previewHighlight} />");
    expect(studio).toContain("max-h-[780px] overflow-y-auto");
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
    expect(studio).toContain("Hover or focus an editable field to outline its matching preview area.");
    expect(website).toContain("highlightedSection?: WebsitePreviewSection | null");
    expect(website).toContain('data-preview-section="hero"');
    expect(website).toContain('data-preview-section="admissions"');
    expect(website).toContain("ring-2 ring-[#e1a62d]");
  });
});
