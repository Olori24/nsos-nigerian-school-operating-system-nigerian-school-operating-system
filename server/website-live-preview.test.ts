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
    expect(website).toContain("<SchoolWebsiteLayout site={site} preview />");
    expect(website).toContain("Live draft preview — not yet public");
  });

  it("renders the current studio form as a clearly labelled, scrollable draft-safe preview", () => {
    expect(studio).toContain('import { SchoolWebsitePreview } from "@/pages/SchoolWebsite"');
    expect(studio).toContain("Live website preview");
    expect(studio).toContain("Draft-safe preview");
    expect(studio).toContain("<SchoolWebsitePreview school={config.data.school} website={form} admissionsEnabled={form.admissionsEnabled} />");
    expect(studio).toContain("max-h-[780px] overflow-y-auto");
  });
});
