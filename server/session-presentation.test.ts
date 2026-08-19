import { describe, expect, it } from "vitest";
import { sessionPresentation } from "../client/src/lib/sessionPresentation";

describe("Account & security session-list presentation", () => {
  it("uses the stored coarse location label and desktop icon choice", () => {
    expect(sessionPresentation({ deviceKind: "desktop", locationLabel: "Nigeria · Africa/Lagos" })).toEqual({ deviceIcon: "desktop", locationText: "Approximate location: Nigeria · Africa/Lagos" });
  });

  it("shows the honest legacy-session fallback rather than inventing a location", () => {
    expect(sessionPresentation({ deviceKind: "mobile", locationLabel: null })).toEqual({ deviceIcon: "mobile", locationText: "Location not reported by this device" });
  });

  it("keeps tablet and unknown devices visually distinct", () => {
    expect(sessionPresentation({ deviceKind: "tablet", locationLabel: "Africa/Accra" }).deviceIcon).toBe("tablet");
    expect(sessionPresentation({ deviceKind: "television", locationLabel: "Africa/Accra" }).deviceIcon).toBe("unknown");
  });
});
