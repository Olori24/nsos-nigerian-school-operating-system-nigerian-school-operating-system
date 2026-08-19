import { describe, expect, it } from "vitest";
import { sessionPresentation, sessionRevokeConfirmation, sessionRevokeSuccessNotice, sessionSecurityActivityPresentation } from "../client/src/lib/sessionPresentation";

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

  it("reports successful device sign-out using only the safe device label", () => {
    expect(sessionRevokeSuccessNotice({ deviceLabel: "Chrome on Windows device" })).toEqual({
      title: "Chrome on Windows device signed out.",
      description: "This device no longer has access to your NSOS account.",
    });
  });

  it("presents security history without session tokens or raw network details", () => {
    expect(sessionSecurityActivityPresentation({ eventType: "session_revoked", deviceLabel: "Safari on iPhone or iPad", locationLabel: "Nigeria · Africa/Lagos" })).toEqual({
      label: "Session revoked",
      title: "Safari on iPhone or iPad was signed out",
      description: "This device can no longer access your NSOS account.",
      locationText: "Approximate location: Nigeria · Africa/Lagos",
      tone: "rose",
    });
    expect(sessionSecurityActivityPresentation({ eventType: "session_verified", deviceLabel: "Chrome on Windows device", locationLabel: null }).locationText).toBe("Location not reported by this device");
  });
});
