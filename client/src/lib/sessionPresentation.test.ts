import { describe, expect, it } from "vitest";
import { sessionPresentation } from "./sessionPresentation";

describe("session list presentation", () => {
  it("renders a stored coarse location label for an active desktop session", () => {
    expect(sessionPresentation({ deviceKind: "desktop", locationLabel: "Nigeria · Africa/Lagos" })).toEqual({ deviceIcon: "desktop", locationText: "Approximate location: Nigeria · Africa/Lagos" });
  });

  it("renders the legacy-session location fallback without inventing a location", () => {
    expect(sessionPresentation({ deviceKind: "mobile", locationLabel: null })).toEqual({ deviceIcon: "mobile", locationText: "Location not reported by this device" });
  });

  it("maps tablet and unknown session device kinds to distinct visual choices", () => {
    expect(sessionPresentation({ deviceKind: "tablet", locationLabel: "Africa/Accra" }).deviceIcon).toBe("tablet");
    expect(sessionPresentation({ deviceKind: "television", locationLabel: "Africa/Accra" }).deviceIcon).toBe("unknown");
  });
});
