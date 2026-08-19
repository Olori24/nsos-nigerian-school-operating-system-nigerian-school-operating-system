import { describe, expect, it } from "vitest";
import { sessionPresentation, sessionRevokeConfirmation } from "../client/src/lib/sessionPresentation";

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

  it("requires a deliberate, cancellation-safe confirmation before a device is signed out", () => {
    expect(sessionRevokeConfirmation({ deviceLabel: "Safari on iPhone or iPad", deviceKind: "mobile", locationLabel: "Nigeria · Africa/Lagos" })).toEqual({
      title: "Sign out this device?",
      description: "This will immediately end the selected NSOS session. The device will need to sign in again to regain access.",
      deviceLabel: "Safari on iPhone or iPad",
      locationText: "Approximate location: Nigeria · Africa/Lagos",
      cancelLabel: "Keep session",
      actionLabel: "Sign out device",
    });
  });
});
