import { afterEach, describe, expect, it, vi } from "vitest";
import { makeRequest } from "./map";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OpenStreetMap maps adapter", () => {
  it("uses reverse geocoding when either coordinate is zero", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      place_id: 1,
      lat: "0",
      lon: "0",
      display_name: "Null Island",
      address: { country: "Test" },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await makeRequest<any>("/maps/api/geocode/json", { lat: 0, lng: 0 });
    const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestedUrl.pathname).toBe("/reverse");
    expect(requestedUrl.searchParams.get("lat")).toBe("0");
    expect(requestedUrl.searchParams.get("lon")).toBe("0");
    expect(result.results[0].formatted_address).toBe("Null Island");
  });

  it("requests an encoded route polyline and returns a string in the Google-compatible shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "Ok",
      waypoints: [{ location: [3.1, 6.2] }, { location: [3.2, 6.3] }],
      routes: [{
        geometry: "encoded-route",
        legs: [{
          summary: "Main road",
          distance: 1200,
          duration: 300,
          steps: [{
            distance: 1200,
            duration: 300,
            name: "Main road",
            mode: "driving",
            maneuver: { type: "turn", modifier: "right", location: [3.1, 6.2] },
          }],
        }],
      }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await makeRequest<any>("/maps/api/directions/json", { origin: "6.2,3.1", destination: "6.3,3.2" });
    const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestedUrl.searchParams.get("geometries")).toBe("polyline");
    expect(result.routes[0].overview_polyline.points).toBe("encoded-route");
    expect(typeof result.routes[0].legs[0].steps[0].html_instructions).toBe("string");
    expect(result.routes[0].legs[0].steps[0].start_location).toEqual({ lat: 6.2, lng: 3.1 });
  });

  it("uses each origin's own distance row in multi-origin distance matrices", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "Ok",
      durations: [[60, 120], [180, 240]],
      distances: [[1000, 2000], [3000, 4000]],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await makeRequest<any>("/maps/api/distancematrix/json", {
      origins: "6.2,3.1|6.3,3.2",
      destinations: "6.4,3.3|6.5,3.4",
    });
    expect(result.rows[0].elements[0].distance.value).toBe(1000);
    expect(result.rows[1].elements[0].distance.value).toBe(3000);
    expect(result.rows[1].elements[1].distance.value).toBe(4000);
  });
});
