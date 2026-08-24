const STAGING_HOST_MARKER = /(^|[.-])(staging|stage|test|sandbox)([.-]|$)/i;
const LIVE_NSOS_HOST = "nsos-system-uhkdscaf.manus.space";

export function boundedInteger(value, fallback, maximum) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

export function safeStagingHealthTarget(input) {
  if (input.approved !== "true") throw new Error("Set NSOS_LOAD_TEST_APPROVED=true only for an approved isolated staging run.");
  if (!input.baseUrl) throw new Error("Set NSOS_STAGING_AUDIT_URL to the isolated staging base URL. This probe never defaults to production.");

  let target;
  try { target = new URL(input.baseUrl); }
  catch { throw new Error("NSOS_STAGING_AUDIT_URL must be a valid absolute URL."); }

  if (target.protocol !== "https:") throw new Error("The staging probe requires an HTTPS staging URL.");
  if (target.hostname === LIVE_NSOS_HOST || !STAGING_HOST_MARKER.test(target.hostname)) {
    throw new Error("The staging probe requires a distinct staging/test/sandbox hostname and refuses the live NSOS host.");
  }
  target.pathname = "/api/trpc/system.health";
  target.search = "";
  target.hash = "";
  return target;
}
