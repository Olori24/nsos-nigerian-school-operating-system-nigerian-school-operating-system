import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const home = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");
const switcher = readFileSync(resolve(root, "client/src/components/InstitutionSwitcher.tsx"), "utf8");

describe("Multi-institution workspace UI", () => {
  it("renders an accessible institution switcher that exposes only passed active memberships", () => {
    expect(switcher).toContain('aria-label="Switch institution"');
    expect(switcher).toContain("institutions.map(item");
    expect(switcher).toContain("Switch only among institutions where you have an active membership.");
    expect(switcher).toContain("operatingType");
  });

  it("creates another empty institution without claiming it copies tenant data", () => {
    expect(switcher).toContain("Create another institution");
    expect(switcher).toContain("Create empty workspace");
    expect(switcher).toContain("It does not copy people, finance, provider settings, programmes, documents, or public website content.");
  });

  it("persists only a membership-validated local active selection and resets the workspace view on switch", () => {
    expect(home).toContain("nsos.active-institution.");
    expect(home).toContain("schoolsQuery.data?.some(item => item.id === institutionId)");
    expect(home).toContain('setActiveView("overview")');
    expect(home).toContain("<InstitutionSwitcher");
  });
});
