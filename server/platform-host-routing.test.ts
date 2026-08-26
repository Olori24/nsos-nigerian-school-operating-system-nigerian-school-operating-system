import { describe, expect, it } from "vitest";
import { isNsosPlatformHost } from "../client/src/lib/platformHost";

describe("NSOS platform host routing", () => {
  it("recognises platform-managed and NSOS-owned product domains case-insensitively", () => {
    expect(isNsosPlatformHost("nsos.top")).toBe(true);
    expect(isNsosPlatformHost("WWW.NSOS.TOP")).toBe(true);
    expect(isNsosPlatformHost("nsos-system-uhkdscaf.manus.space")).toBe(true);
  });

  it("leaves external school domains for the tenant public-site resolver", () => {
    expect(isNsosPlatformHost("admissions.example-school.ng")).toBe(false);
  });
});
