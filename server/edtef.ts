const EDTEF_BASE_URL = "https://api.edtef.org/public";
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const REQUEST_TIMEOUT_MS = 8_000;

type CacheEntry = { expiresAt: number; value: unknown };
const responseCache = new Map<string, CacheEntry>();

export class EdtefApiError extends Error {
  constructor(message: string, readonly status: number, readonly retryAfter?: string) {
    super(message);
    this.name = "EdtefApiError";
  }
}

function apiKey() {
  return process.env.EDTEF_API_KEY?.trim() ?? "";
}

function cacheKey(path: string, query: URLSearchParams) {
  return `${path}?${query.toString()}`;
}

function readCache(key: string, now: number) {
  const entry = responseCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= now) {
    responseCache.delete(key);
    return undefined;
  }
  return entry.value;
}

function writeCache(key: string, value: unknown, now: number) {
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
}

export async function requestEdtefJson(path: string, query = new URLSearchParams()) {
  const key = apiKey();
  if (!key) throw new EdtefApiError("EDTEF directory integration is not configured.", 503);

  const normalizedPath = path.replace(/^\/+/, "");
  if (!/^directory\/v1\/(?:schools(?:\/[A-Za-z0-9_-]{1,128})?|states)$/.test(normalizedPath)) {
    throw new EdtefApiError("Unsupported EDTEF directory resource.", 400);
  }

  const cacheId = cacheKey(normalizedPath, query);
  const now = Date.now();
  const cached = readCache(cacheId, now);
  if (cached !== undefined) return cached;

  let response: Response;
  try {
    response = await fetch(`${EDTEF_BASE_URL}/${normalizedPath}${query.size ? `?${query.toString()}` : ""}`, {
      method: "GET",
      headers: { "x-api-key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new EdtefApiError("EDTEF directory is temporarily unreachable.", 502);
  }

  if (response.status === 429) {
    throw new EdtefApiError("EDTEF rate limit reached. Please retry shortly.", 429, response.headers.get("retry-after") ?? undefined);
  }
  if (!response.ok) {
    throw new EdtefApiError("EDTEF directory request failed.", 502);
  }

  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new EdtefApiError("EDTEF returned an invalid response.", 502);
  }

  writeCache(cacheId, value, now);
  return value;
}

export function clearEdtefCacheForTests() {
  responseCache.clear();
}
