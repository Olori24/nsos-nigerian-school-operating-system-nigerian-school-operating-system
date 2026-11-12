import { describe, expect, it } from "vitest";
import { isNsosPlatformHost } from "../shared/platform-host";

describe("isNsosPlatformHost", () => {
  it("recognizes the NSOS canonical and legacy platform hosts", () => {
    expect(isNsosPlatformHost("nsos.top")).toBe(true);
    expect(isNsosPlatformHost("www.nsos.top")).toBe(true);
    expect(isNsosPlatformHost("localhost")).toBe(true);
    expect(isNsosPlatformHost("preview.manus.space")).toBe(true);
  });

  it("recognizes only the NSOS Vercel migration project's preview hosts", () => {
    expect(
      isNsosPlatformHost(
        "nsos-vercel-migration-m66s8anzc-bakande11-2779s-projects.vercel.app"
      )
    ).toBe(true);
    expect(isNsosPlatformHost("nsos-vercel-migration.vercel.app")).toBe(true);
    expect(isNsosPlatformHost("unrelated-project.vercel.app")).toBe(false);
  });

  it("does not classify customer school domains as the NSOS platform", () => {
    expect(isNsosPlatformHost("school.example.ng")).toBe(false);
    expect(isNsosPlatformHost("my-school.com")).toBe(false);
  });
});
