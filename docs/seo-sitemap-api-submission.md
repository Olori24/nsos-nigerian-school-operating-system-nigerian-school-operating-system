# Sitemap API submission

`scripts/submit-sitemap.mjs` validates the public sitemap and submits it to Google Search Console and Bing Webmaster Tools without storing credentials in the repository.

## What the script does

1. Fetches `https://nsos.top/sitemap.xml` over HTTPS.
2. Checks the response content type and verifies that the body contains sitemap XML and at least one `<loc>` entry.
3. Submits the sitemap to Google Search Console with the official `sitemaps.submit` endpoint.
4. Submits the sitemap to Bing through the JSON/HTTP Webmaster endpoint.
5. Uses bounded retries for timeouts, rate limits, and 5xx responses.
6. Redacts configured secrets from errors and output.
7. Supports `--dry-run` and `--validate-only` so configuration can be checked before provider calls.

A successful API response means the provider accepted the submission request. It does **not** guarantee crawling, processing, or indexation.

## Prerequisites

### Google Search Console

- Verify `https://nsos.top/` as a URL-prefix property, or use the equivalent verified domain property.
- Create OAuth 2.0 credentials in a Google Cloud project.
- Obtain a refresh token with the `https://www.googleapis.com/auth/webmasters` scope.
- The Google account represented by the OAuth token must have access to the Search Console property.

Environment variables:

```bash
export GOOGLE_SEARCH_CONSOLE_CLIENT_ID='...'
export GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET='...'
export GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN='...'
export GOOGLE_SEARCH_CONSOLE_SITE_URL='https://nsos.top/'
```

The script refreshes the access token at runtime and calls:

```text
PUT https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}
```

No request body is sent, matching Google’s official API contract.

### Bing Webmaster Tools

- Add and verify `https://nsos.top/` in Bing Webmaster Tools.
- Prefer the current OAuth 2.0 access-token flow when available:

```bash
export BING_WEBMASTER_ACCESS_TOKEN='...'
```

- The Bing API also supports a user-level API key:

```bash
export BING_WEBMASTER_API_KEY='...'
```

Use **one** Bing credential method. The API key must never be committed or printed.

The default endpoint is the Bing JSON/HTTP sitemap operation:

```text
https://ssl.bing.com/webmaster/api.svc/json/SubmitSitemap
```

If Bing provides a different endpoint for the account or current API version, set:

```bash
export BING_WEBMASTER_ENDPOINT='https://...'
```

Microsoft’s current overview warns that legacy SOAP and POX APIs were retired on August 31, 2026; this script does not use those protocols.

## Commands

Validate only, with no provider credentials or submissions:

```bash
node scripts/submit-sitemap.mjs --validate-only
```

Print the Google and Bing requests without making provider submissions:

```bash
node scripts/submit-sitemap.mjs --provider all --dry-run
```

Submit to Google only:

```bash
node scripts/submit-sitemap.mjs --provider google
```

Submit to Bing only:

```bash
node scripts/submit-sitemap.mjs --provider bing
```

Override the sitemap URL for another verified environment:

```bash
node scripts/submit-sitemap.mjs \
  --sitemap-url https://staging.example.com/sitemap.xml \
  --google-site-url https://staging.example.com/ \
  --bing-site-url https://staging.example.com/ \
  --provider all \
  --dry-run
```

## Safety notes

- Run `--validate-only`, then `--dry-run`, before a real submission.
- Use a secret manager or CI secret store for OAuth credentials and Bing tokens.
- Do not place tokens in `.env` files that could be committed, shell history, logs, or issue comments.
- Sitemap submission is a crawl request, not a guarantee of search indexation.
- For ongoing indexation evidence, inspect the Sitemaps and Page Indexing reports in Google Search Console and Bing Webmaster Tools.

## Official references

- [Google Search Console — Sitemaps: submit](https://developers.google.com/webmaster-tools/v1/sitemaps/submit)
- [Google Search Console — Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Bing Webmaster API overview](https://learn.microsoft.com/en-us/bingwebmaster/)
- [Bing Webmaster API access](https://learn.microsoft.com/en-us/bingwebmaster/getting-access)
