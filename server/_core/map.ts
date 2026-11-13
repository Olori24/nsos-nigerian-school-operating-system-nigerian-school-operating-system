const USER_AGENT = process.env.MAPS_USER_AGENT ?? "NSOS/1.0 (https://nsos.top)";
const OSRM_BASE = "https://router.project-osrm.org";
const PHOTON_BASE = "https://photon.komoot.io/api/";

interface RequestOptions { method?: "GET" | "POST"; body?: Record<string, unknown> }

const splitLocations = (value: unknown) => String(value ?? "").split("|").map(item => item.trim()).filter(Boolean);
const toLatLon = (value: string) => {
  const parts = value.split(",").map(Number);
  if (parts.length !== 2 || parts.some(part => !Number.isFinite(part))) throw new Error("Location must be expressed as latitude,longitude.");
  return { lat: parts[0], lon: parts[1] };
};
const profileFor = (mode: unknown) => mode === "walking" ? "walking" : mode === "bicycling" ? "cycling" : "driving";

async function requestJson<T>(url: URL, timeout = 15_000): Promise<T> {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "application/json" }, signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`OpenStreetMap provider request failed (${response.status}).`);
  return await response.json() as T;
}

function normalizePhotonFeature(feature: any) {
  const coordinates = feature?.geometry?.coordinates ?? [];
  const properties = feature?.properties ?? {};
  return {
    place_id: `${properties.osm_type ?? "N"}${properties.osm_id ?? ""}`,
    name: properties.name ?? properties.street ?? properties.city ?? properties.country ?? "",
    formatted_address: [properties.name, properties.street, properties.city, properties.state, properties.country].filter(Boolean).join(", "),
    geometry: { location: { lat: Number(coordinates[1]), lng: Number(coordinates[0]) } },
    address_components: properties,
  };
}

/**
 * OpenStreetMap-backed replacement for the former hosted Google Maps proxy.
 * Supports geocoding, directions, distance matrices and place search.
 */
export async function makeRequest<T = unknown>(
  endpoint: string,
  params: Record<string, unknown> = {},
  _options: RequestOptions = {},
): Promise<T> {
  const path = endpoint.toLowerCase();
  if (path.includes("/geocode/json")) {
    const url = new URL("https://nominatim.openstreetmap.org/" + (params.lat && params.lng ? "reverse" : "search"));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", String(params.limit ?? 5));
    if (params.lat && params.lng) { url.searchParams.set("lat", String(params.lat)); url.searchParams.set("lon", String(params.lng)); }
    else url.searchParams.set("q", String(params.address ?? params.q ?? ""));
    const result = await requestJson<any>(url);
    const records = Array.isArray(result) ? result : [result];
    return { status: records.length ? "OK" : "ZERO_RESULTS", results: records.map((item: any) => ({
      place_id: String(item.place_id), formatted_address: item.display_name,
      geometry: { location: { lat: Number(item.lat), lng: Number(item.lon) } },
      address_components: item.address ?? {},
    })) } as T;
  }

  if (path.includes("/directions/json")) {
    const origin = toLatLon(String(params.origin ?? ""));
    const destination = toLatLon(String(params.destination ?? ""));
    const url = new URL(`${OSRM_BASE}/route/v1/${profileFor(params.mode)}/${origin.lon},${origin.lat};${destination.lon},${destination.lat}`);
    url.searchParams.set("overview", "full"); url.searchParams.set("geometries", "geojson"); url.searchParams.set("steps", "true");
    const result = await requestJson<any>(url);
    return { status: result.code === "Ok" ? "OK" : result.code, routes: (result.routes ?? []).map((route: any) => ({
      summary: route.legs?.[0]?.summary ?? "", overview_polyline: { points: route.geometry },
      legs: (route.legs ?? []).map((leg: any) => ({ distance: { value: leg.distance, text: `${(leg.distance / 1000).toFixed(1)} km` }, duration: { value: leg.duration, text: `${Math.round(leg.duration / 60)} mins` }, start_address: String(params.origin), end_address: String(params.destination), steps: leg.steps ?? [] })),
    })) } as T;
  }

  if (path.includes("/distancematrix/json")) {
    const origins = splitLocations(params.origins).map(toLatLon);
    const destinations = splitLocations(params.destinations).map(toLatLon);
    const coordinates = [...origins, ...destinations].map(point => `${point.lon},${point.lat}`).join(";");
    const url = new URL(`${OSRM_BASE}/table/v1/${profileFor(params.mode)}/${coordinates}`);
    url.searchParams.set("sources", origins.map((_, i) => i).join(";"));
    url.searchParams.set("destinations", destinations.map((_, i) => i + origins.length).join(";"));
    const result = await requestJson<any>(url);
    return { status: result.code === "Ok" ? "OK" : result.code, rows: (result.durations ?? []).map((row: number[]) => ({ elements: row.map((duration, i) => ({ status: Number.isFinite(duration) ? "OK" : "ZERO_RESULTS", duration: { value: duration, text: `${Math.round(duration / 60)} mins` }, distance: { value: result.distances?.[0]?.[i] ?? 0, text: `${((result.distances?.[0]?.[i] ?? 0) / 1000).toFixed(1)} km` } })) })) } as T;
  }

  if (path.includes("/place/") || path.includes("/place/textsearch") || path.includes("/place/nearbysearch") || path.includes("/place/autocomplete")) {
    const url = new URL(PHOTON_BASE);
    const query = params.query ?? params.input ?? params.name ?? params.keyword;
    if (query) url.searchParams.set("q", String(query));
    if (params.location) {
      const location = toLatLon(String(params.location));
      url.searchParams.set("lat", String(location.lat)); url.searchParams.set("lon", String(location.lon));
    }
    url.searchParams.set("limit", String(Math.min(20, Math.max(1, Number(params.limit ?? 10)))));
    const result = await requestJson<any>(url);
    return { status: result.features?.length ? "OK" : "ZERO_RESULTS", results: (result.features ?? []).map(normalizePhotonFeature) } as T;
  }

  throw new Error(`Unsupported map operation: ${endpoint}. Supported operations are geocoding, directions, distance matrix and place search.`);
}

// ============================================================================
// Type Definitions
// ============================================================================

export type TravelMode = "driving" | "walking" | "bicycling" | "transit";
export type MapType = "roadmap" | "satellite" | "terrain" | "hybrid";
export type SpeedUnit = "KPH" | "MPH";

export type LatLng = {
  lat: number;
  lng: number;
};

export type DirectionsResult = {
  routes: Array<{
    legs: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      start_address: string;
      end_address: string;
      start_location: LatLng;
      end_location: LatLng;
      steps: Array<{
        distance: { text: string; value: number };
        duration: { text: string; value: number };
        html_instructions: string;
        travel_mode: string;
        start_location: LatLng;
        end_location: LatLng;
      }>;
    }>;
    overview_polyline: { points: string };
    summary: string;
    warnings: string[];
    waypoint_order: number[];
  }>;
  status: string;
};

export type DistanceMatrixResult = {
  rows: Array<{
    elements: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      status: string;
    }>;
  }>;
  origin_addresses: string[];
  destination_addresses: string[];
  status: string;
};

export type GeocodingResult = {
  results: Array<{
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    formatted_address: string;
    geometry: {
      location: LatLng;
      location_type: string;
      viewport: {
        northeast: LatLng;
        southwest: LatLng;
      };
    };
    place_id: string;
    types: string[];
  }>;
  status: string;
};

export type PlacesSearchResult = {
  results: Array<{
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: {
      location: LatLng;
    };
    rating?: number;
    user_ratings_total?: number;
    business_status?: string;
    types: string[];
  }>;
  status: string;
};

export type PlaceDetailsResult = {
  result: {
    place_id: string;
    name: string;
    formatted_address: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    rating?: number;
    user_ratings_total?: number;
    reviews?: Array<{
      author_name: string;
      rating: number;
      text: string;
      time: number;
    }>;
    opening_hours?: {
      open_now: boolean;
      weekday_text: string[];
    };
    geometry: {
      location: LatLng;
    };
  };
  status: string;
};

export type ElevationResult = {
  results: Array<{
    elevation: number;
    location: LatLng;
    resolution: number;
  }>;
  status: string;
};

export type TimeZoneResult = {
  dstOffset: number;
  rawOffset: number;
  status: string;
  timeZoneId: string;
  timeZoneName: string;
};

export type RoadsResult = {
  snappedPoints: Array<{
    location: LatLng;
    originalIndex?: number;
    placeId: string;
  }>;
};

// ============================================================================
// Google Maps API Reference
// ============================================================================

/**
 * GEOCODING - Convert between addresses and coordinates
 * Endpoint: /maps/api/geocode/json
 * Input: { address: string } OR { latlng: string }  // latlng: "37.42,-122.08"
 * Output: GeocodingResult  // results[0].geometry.location, results[0].formatted_address
 */

/**
 * DIRECTIONS - Get navigation routes between locations
 * Endpoint: /maps/api/directions/json
 * Input: { origin: string, destination: string, mode?: TravelMode, waypoints?: string, alternatives?: boolean }
 * Output: DirectionsResult  // routes[0].legs[0].distance, duration, steps
 */

/**
 * DISTANCE MATRIX - Calculate travel times/distances for multiple origin-destination pairs
 * Endpoint: /maps/api/distancematrix/json
 * Input: { origins: string, destinations: string, mode?: TravelMode, units?: "metric"|"imperial" }  // origins: "NYC|Boston"
 * Output: DistanceMatrixResult  // rows[0].elements[1] = first origin to second destination
 */

/**
 * PLACE SEARCH - Find businesses/POIs by text query
 * Endpoint: /maps/api/place/textsearch/json
 * Input: { query: string, location?: string, radius?: number, type?: string }  // location: "40.7,-74.0"
 * Output: PlacesSearchResult  // results[].name, rating, geometry.location, place_id
 */

/**
 * NEARBY SEARCH - Find places near a specific location
 * Endpoint: /maps/api/place/nearbysearch/json
 * Input: { location: string, radius: number, type?: string, keyword?: string }  // location: "40.7,-74.0"
 * Output: PlacesSearchResult
 */

/**
 * PLACE DETAILS - Get comprehensive information about a specific place
 * Endpoint: /maps/api/place/details/json
 * Input: { place_id: string, fields?: string }  // fields: "name,rating,opening_hours,website"
 * Output: PlaceDetailsResult  // result.name, rating, opening_hours, etc.
 */

/**
 * ELEVATION - Get altitude data for geographic points
 * Endpoint: /maps/api/elevation/json
 * Input: { locations?: string, path?: string, samples?: number }  // locations: "39.73,-104.98|36.45,-116.86"
 * Output: ElevationResult  // results[].elevation (meters)
 */

/**
 * TIME ZONE - Get timezone information for a location
 * Endpoint: /maps/api/timezone/json
 * Input: { location: string, timestamp: number }  // timestamp: Math.floor(Date.now()/1000)
 * Output: TimeZoneResult  // timeZoneId, timeZoneName
 */

/**
 * ROADS - Snap GPS traces to roads, find nearest roads, get speed limits
 * - /v1/snapToRoads: Input: { path: string, interpolate?: boolean }  // path: "lat,lng|lat,lng"
 * - /v1/nearestRoads: Input: { points: string }  // points: "lat,lng|lat,lng"
 * - /v1/speedLimits: Input: { path: string, units?: SpeedUnit }
 * Output: RoadsResult
 */

/**
 * PLACE AUTOCOMPLETE - Real-time place suggestions as user types
 * Endpoint: /maps/api/place/autocomplete/json
 * Input: { input: string, location?: string, radius?: number }
 * Output: { predictions: Array<{ description: string, place_id: string }> }
 */

/**
 * STATIC MAPS - Generate map images as URLs (for emails, reports, <img> tags)
 * Endpoint: /maps/api/staticmap
 * Input: URL params - center: string, zoom: number, size: string, markers?: string, maptype?: MapType
 * Output: Image URL (not JSON) - use directly in <img src={url} />
 * Note: Construct URL manually with getMapsConfig() for auth
 */




