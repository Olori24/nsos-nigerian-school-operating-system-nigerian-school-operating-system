#!/usr/bin/env node

/**
 * Submit a verified sitemap to Google Search Console and/or Bing Webmaster Tools.
 *
 * This script never stores credentials. Supply them through environment variables
 * or a secret manager, and use --dry-run before making provider API calls.
 */

const DEFAULT_SITEMAP_URL = "https://nsos.top/sitemap.xml";
const DEFAULT_GOOGLE_SITE_URL = "https://nsos.top/";
const DEFAULT_BING_SITE_URL = "https://nsos.top/";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SUBMIT_BASE = "https://www.googleapis.com/webmasters/v3/sites";
const BING_SUBMIT_URL =
  "https://ssl.bing.com/webmaster/api.svc/json/SubmitSitemap";
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function usage() {
  console.log(`Usage: node scripts/submit-sitemap.mjs [options]

Options:
  --provider <all|google|bing>  Provider to use (default: all)
  --sitemap-url <url>           Public sitemap URL (default: ${DEFAULT_SITEMAP_URL})
  --google-site-url <url>       Search Console property URL (default: ${DEFAULT_GOOGLE_SITE_URL})
  --bing-site-url <url>         Bing verified site URL (default: ${DEFAULT_BING_SITE_URL})
  --dry-run                     Validate and print requests without submitting
  --validate-only               Validate the public sitemap and exit
  --retries <count>             Retries for transient failures (default: 3)
  --timeout-ms <ms>             Per-request timeout (default: 30000)
  --help                        Show this help

Google environment variables:
  GOOGLE_SEARCH_CONSOLE_CLIENT_ID
  GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET
  GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN

Bing environment variables (use OAuth when available; API key is also supported):
  BING_WEBMASTER_ACCESS_TOKEN
  BING_WEBMASTER_API_KEY
  BING_WEBMASTER_ENDPOINT (optional override; defaults to Bing JSON/HTTP endpoint)
`);
}

function parseArgs(argv) {
  const options = {
    provider: "all",
    sitemapUrl: process.env.SITEMAP_URL || DEFAULT_SITEMAP_URL,
    googleSiteUrl:
      process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || DEFAULT_GOOGLE_SITE_URL,
    bingSiteUrl: process.env.BING_WEBMASTER_SITE_URL || DEFAULT_BING_SITE_URL,
    dryRun: false,
    validateOnly: false,
    retries: 3,
    timeoutMs: 30_000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help") {
      usage();
      process.exit(0);
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--validate-only") {
      options.validateOnly = true;
      continue;
    }
    const [flag, inlineValue] = arg.split("=", 2);
    const value = inlineValue ?? argv[++i];
    if (!value) throw new Error(`Missing value for ${flag}`);
    if (flag === "--provider") options.provider = value;
    else if (flag === "--sitemap-url") options.sitemapUrl = value;
    else if (flag === "--google-site-url") options.googleSiteUrl = value;
    else if (flag === "--bing-site-url") options.bingSiteUrl = value;
    else if (flag === "--retries") options.retries = Number(value);
    else if (flag === "--timeout-ms") options.timeoutMs = Number(value);
    else throw new Error(`Unknown option: ${flag}`);
  }

  if (!["all", "google", "bing"].includes(options.provider)) {
    throw new Error("--provider must be all, google, or bing");
  }
  if (
    !Number.isInteger(options.retries) ||
    options.retries < 0 ||
    options.retries > 10
  ) {
    throw new Error("--retries must be an integer between 0 and 10");
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1000) {
    throw new Error("--timeout-ms must be an integer of at least 1000");
  }
  for (const [name, value] of [
    ["sitemap URL", options.sitemapUrl],
    ["Google site URL", options.googleSiteUrl],
    ["Bing site URL", options.bingSiteUrl],
  ]) {
    const url = new URL(value);
    if (url.protocol !== "https:")
      throw new Error(`${name} must use HTTPS: ${value}`);
  }
  return options;
}

function redact(text) {
  return String(text)
    .replaceAll(
      process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET || "\u0000",
      "[REDACTED]"
    )
    .replaceAll(
      process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN || "\u0000",
      "[REDACTED]"
    )
    .replaceAll(process.env.BING_WEBMASTER_API_KEY || "\u0000", "[REDACTED]")
    .replaceAll(
      process.env.BING_WEBMASTER_ACCESS_TOKEN || "\u0000",
      "[REDACTED]"
    );
}

async function readResponse(response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES)
      throw new Error("Provider response exceeded the safety size limit");
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function request(url, init, { retries, timeoutMs, label }) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const body = await readResponse(response);
      if (response.ok) return { response, body };
      const transient =
        response.status === 408 ||
        response.status === 425 ||
        response.status === 429 ||
        response.status >= 500;
      lastError = new Error(
        `${label} returned HTTP ${response.status}: ${redact(body).slice(0, 500)}`
      );
      if (!transient || attempt === retries) throw lastError;
    } catch (error) {
      lastError = error;
      if (attempt === retries)
        throw new Error(
          `${label} failed after ${attempt + 1} attempt(s): ${redact(error.message)}`
        );
    } finally {
      clearTimeout(timer);
    }
    await sleep(Math.min(1000 * 2 ** attempt, 8000));
  }
  throw lastError;
}

async function validateSitemap(options) {
  const result = await request(
    options.sitemapUrl,
    {
      headers: { Accept: "application/xml,text/xml;q=0.9,text/plain;q=0.8" },
    },
    { ...options, label: "Sitemap fetch" }
  );
  const type = result.response.headers.get("content-type") || "";
  const body = result.body.trim();
  if (!/xml|text\/plain/i.test(type)) {
    throw new Error(
      `Sitemap content type is not XML/plain text: ${type || "missing"}`
    );
  }
  if (
    !body.startsWith("<?xml") &&
    !body.includes("<urlset") &&
    !body.includes("<sitemapindex")
  ) {
    throw new Error("Sitemap response does not look like an XML sitemap");
  }
  const urlCount = (body.match(/<loc[>\s]/g) || []).length;
  if (urlCount === 0) throw new Error("Sitemap contains no <loc> entries");
  console.log(
    JSON.stringify({
      check: "sitemap",
      url: options.sitemapUrl,
      status: result.response.status,
      contentType: type,
      bytes: Buffer.byteLength(result.body),
      locEntries: urlCount,
    })
  );
}

async function getGoogleAccessToken(options) {
  const clientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google requires GOOGLE_SEARCH_CONSOLE_CLIENT_ID, GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET, and GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN"
    );
  }
  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const result = await request(
    GOOGLE_TOKEN_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: form,
    },
    { ...options, label: "Google OAuth token request" }
  );
  let token;
  try {
    token = JSON.parse(result.body);
  } catch {
    throw new Error("Google OAuth token response was not JSON");
  }
  if (!token.access_token)
    throw new Error("Google OAuth token response did not contain access_token");
  return token.access_token;
}

async function submitGoogle(options) {
  const endpoint = `${GOOGLE_SUBMIT_BASE}/${encodeURIComponent(options.googleSiteUrl)}/sitemaps/${encodeURIComponent(options.sitemapUrl)}`;
  console.log(
    JSON.stringify({
      provider: "google",
      method: "PUT",
      endpoint,
      siteUrl: options.googleSiteUrl,
      sitemapUrl: options.sitemapUrl,
    })
  );
  if (options.dryRun) return;
  const accessToken = await getGoogleAccessToken(options);
  const result = await request(
    endpoint,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
    { ...options, label: "Google sitemap submission" }
  );
  console.log(
    JSON.stringify({
      provider: "google",
      submitted: true,
      status: result.response.status,
    })
  );
}

async function submitBing(options) {
  const accessToken = process.env.BING_WEBMASTER_ACCESS_TOKEN;
  const apiKey = process.env.BING_WEBMASTER_API_KEY;
  const endpoint = new URL(
    process.env.BING_WEBMASTER_ENDPOINT || BING_SUBMIT_URL
  );
  endpoint.searchParams.set("siteUrl", options.bingSiteUrl);
  endpoint.searchParams.set("sitemap", options.sitemapUrl);
  if (apiKey) endpoint.searchParams.set("apikey", apiKey);
  console.log(
    JSON.stringify({
      provider: "bing",
      method: "GET",
      endpoint: endpoint.toString().replace(apiKey || "\u0000", "[REDACTED]"),
      siteUrl: options.bingSiteUrl,
      sitemapUrl: options.sitemapUrl,
      auth: accessToken ? "oauth" : apiKey ? "api-key" : "not-configured",
    })
  );
  if (options.dryRun) return;
  if (!accessToken && !apiKey) {
    throw new Error(
      "Bing requires BING_WEBMASTER_ACCESS_TOKEN or BING_WEBMASTER_API_KEY"
    );
  }
  const headers = { Accept: "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const result = await request(
    endpoint,
    { headers },
    { ...options, label: "Bing sitemap submission" }
  );
  console.log(
    JSON.stringify({
      provider: "bing",
      submitted: true,
      status: result.response.status,
      response: redact(result.body).slice(0, 500),
    })
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await validateSitemap(options);
  if (options.validateOnly) return;
  if (options.provider === "google" || options.provider === "all")
    await submitGoogle(options);
  if (options.provider === "bing" || options.provider === "all")
    await submitBing(options);
  console.log(
    JSON.stringify({
      complete: true,
      dryRun: options.dryRun,
      provider: options.provider,
    })
  );
}

main().catch(error => {
  console.error(`ERROR: ${redact(error.message)}`);
  process.exitCode = 1;
});
