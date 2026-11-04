import { consumeSharedRateLimit } from "./db";

const EDTEF_BASE_URL = "https://api.edtef.org/public";
const UPSTREAM_DAILY_LIMIT = 8_000;
const UPSTREAM_WINDOW_MS = 24 * 60 * 60 * 1000;
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
  if (!/^directory\/v1\/(?:schools(?:\/sch_[a-f0-9]{12})?|states)$/.test(normalizedPath)) {
    throw new EdtefApiError("Unsupported EDTEF directory resource.", 400);
  }

  const cacheId = cacheKey(normalizedPath, query);
  const now = Date.now();
  const cached = readCache(cacheId, now);
  if (cached !== undefined) return cached;

  let budget: Awaited<ReturnType<typeof consumeSharedRateLimit>>;
  try {
    budget = await consumeSharedRateLimit({
      namespace: "edtef-upstream",
      route: "directory-v1",
      clientKey: "shared-api-key",
      limit: UPSTREAM_DAILY_LIMIT,
      windowMs: UPSTREAM_WINDOW_MS,
    });
  } catch {
    throw new EdtefApiError("EDTEF request protection is temporarily unavailable.", 503);
  }
  if (!budget.allowed) {
    throw new EdtefApiError("EDTEF request budget reached. Please retry after the daily reset.", 429, String(budget.retryAfterSeconds));
  }

  let response: Response;
  try {
    response = await fetch(`${EDTEF_BASE_URL}/${normalizedPath}${query.size ? `?${query.toString()}` : ""}`, {
      method: "GET",
      redirect: "error",
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
