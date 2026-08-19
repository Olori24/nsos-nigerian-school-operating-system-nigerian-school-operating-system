import { describe, expect, it } from "vitest";
import { legacySessionId, sessionDeviceKind, sessionDeviceLabel, sessionLocationLabel } from "./db";

describe("session tracking policies", () => {
  it("returns a safe human-readable device label without storing a raw user agent in the UI model", () => {
    expect(sessionDeviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36")).toBe("Chrome on Windows device");
    expect(sessionDeviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile Safari/604.1")).toBe("Safari on iPhone or iPad");
  });

  it("derives a deterministic opaque legacy session identifier from a cookie value", () => {
    const first = legacySessionId("legacy-cookie-value");
    expect(first).toMatch(/^legacy:[a-f0-9]{48}$/);
    expect(legacySessionId("legacy-cookie-value")).toBe(first);
    expect(legacySessionId("a-different-cookie")).not.toBe(first);
  });

  it("classifies device categories and stores only validated coarse time-zone labels", () => {
    expect(sessionDeviceKind("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Version/17.0 Mobile Safari/604.1")).toBe("tablet");
    expect(sessionDeviceKind("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit Mobile")).toBe("mobile");
    expect(sessionLocationLabel("Africa/Lagos")).toBe("Nigeria · Africa/Lagos");
    expect(sessionLocationLabel("Europe/London")).toBe("Europe/London");
    expect(sessionLocationLabel("not a time zone")).toBeNull();
  });
});
