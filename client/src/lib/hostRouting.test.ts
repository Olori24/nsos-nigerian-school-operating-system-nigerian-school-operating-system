import { describe, expect, it } from "vitest";
import { isNsosPlatformHost } from "./hostRouting";

describe("NSOS platform host routing", () => {
  it.each([
    "nsos.top",
    "www.nsos.top",
    "staging.nsos.top",
    "localhost",
    "127.0.0.1",
    "nsos-preview-abc.vercel.app",
    "deployment-name.vercel.app",
  ])("routes %s through the NSOS application", host => {
    expect(isNsosPlatformHost(host)).toBe(true);
  });

  it.each([
    "school.example.ng",
    "www.school.edu.ng",
    "custom-nsos-school.com",
    "vercel.app",
    "notvercel.app",
  ])("keeps %s on the school custom-domain route", host => {
    expect(isNsosPlatformHost(host)).toBe(false);
  });

  it("normalizes case and a trailing DNS dot", () => {
    expect(isNsosPlatformHost("STAGING.NSOS.TOP.")).toBe(true);
  });
});
