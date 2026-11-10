import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./env", () => ({
  ENV: { googleMapsApiKey: "server-maps-test-key" },
}));

import { makeRequest } from "./map";

describe("standalone Google Maps server client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "OK" }), { status: 200 })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("calls the Google Maps API directly with the server-side key", async () => {
    await expect(makeRequest("/maps/api/geocode/json", { address: "Lagos, Nigeria" })).resolves.toEqual({ status: "OK" });
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const parsed = new URL(String(url));
    expect(parsed.origin).toBe("https://maps.googleapis.com");
    expect(parsed.pathname).toBe("/maps/api/geocode/json");
    expect(parsed.searchParams.get("key")).toBe("server-maps-test-key");
    expect(parsed.searchParams.get("address")).toBe("Lagos, Nigeria");
    expect(new Headers((init as RequestInit).headers).get("content-type")).toBe("application/json");
  });

  it("rejects endpoints outside the Google Maps API path", async () => {
    await expect(makeRequest("https://attacker.example/collect")).rejects.toThrow("Google Maps endpoint is not allowed.");
    expect(fetch).not.toHaveBeenCalled();
  });
});
