# Zero-Cost Browser Automation for NSOS Outreach

**Status:** Implementation plan and deployment runbook. The repository change does not claim that Skyvern is already deployed or that a live browser task has passed.

## Decision

Use self-hosted Skyvern as the AI-directed browser layer, with Playwright as the deterministic browser-control and smoke-test layer. Keep prospect discovery and email delivery outside the browser agent.

- **Skyvern:** navigate a supplied public website, inspect relevant pages, and extract a bounded set of publicly displayed organisation/contact details.
- **Playwright:** deterministic navigation, form-state inspection, screenshots, and repeatable browser checks where a workflow is known.
- **NSOS / outreach ledger:** retain source URL, organisation type, country, public contact channel, evidence timestamp, qualification status, reviewer, and next action.
- **Resend:** remains the separate email delivery provider. Browser automation must not send email or submit contact forms without a separate explicit approval for the exact recipient, content, and action.

## Zero-spend policy

1. Do not create a Skyvern Cloud subscription or use a trial that converts to paid service.
2. Do not add a paid model key, proxy, CAPTCHA service, hosted browser, or paid scraping account.
3. Use self-hosted Skyvern with a local inference endpoint only if the host can run it reliably. Skyvern's local server can use SQLite; an Ollama model is an option, but requires local compute and disk.
4. If local inference is too slow or unavailable, use Playwright only for deterministic public-page checks and keep AI-assisted extraction as a human-reviewed step. Do not silently fall back to a metered provider.
5. Never put API keys, cookies, credentials, prospect personal data, or session exports in Git.

## NSOS hosting boundary

The browser worker is an NSOS-operated backend service. It must not depend on an operator's laptop or phone, and it must not be exposed as a public unauthenticated browser-control endpoint.

### Verified hosting assessment (5 November 2026)

The connected Vercel account reports the NSOS-linked project as `nsos-vercel-migration` on the Hobby plan. The project currently reports `live: false`, and its latest production deployment is in an error state. Vercel Hobby is also documented as intended for non-commercial, personal use. This is not an approved production hosting target for NSOS commercial outreach.

Vercel Functions are serverless request handlers with finite execution, memory, and bundle limits. They are not a persistent Docker host for Skyvern's API, Chromium browser, database, and worker lifecycle. Do not try to install the full Skyvern stack inside the NSOS Express/Vercel function bundle.

Skyvern's official Docker setup documents at least 4 GB of available RAM and a configured LLM provider. Self-hosting removes the Skyvern Cloud subscription, but does not remove compute or model-inference requirements.

### Required architecture

- **NSOS app:** owns authentication, role checks, job creation, approval state, audit records, and the outreach ledger.
- **Browser worker:** runs separately as an NSOS-controlled backend worker. It accepts only signed, scoped jobs from the NSOS queue and returns structured evidence.
- **Skyvern:** provides AI-directed browser execution only when an approved worker host and a zero-cost inference path are available.
- **Playwright:** provides deterministic navigation and browser checks for known page structures; it is not represented as an AI agent.
- **Storage:** persists job state and evidence references in NSOS-owned storage. Do not store browser profiles or session cookies in the prospect ledger.
- **Resend:** remains separate. No browser job can send email or submit a contact form.

### Zero-cost deployment gate

Do not deploy or enable a paid service to get around the current hosting gap. Before enabling a live worker, verify all of the following:

1. NSOS has an approved server/container execution environment with sufficient RAM, persistent job storage, outbound HTTPS, and private service-to-service authentication.
2. The worker can run without relying on the user's personal devices.
3. Skyvern can complete a test using local inference or a provider with an explicitly confirmed free quota and no automatic paid fallback.
4. Usage limits, retention, secrets handling, URL allowlisting, and network isolation are configured.
5. The worker can be stopped or disabled without affecting the NSOS application.

A GitHub Actions runner may be evaluated as an **ephemeral batch runner** for a controlled pilot, but it is not a persistent Skyvern service and must not be described as NSOS production hosting. Any such use must be checked against repository visibility, Actions quotas, and the chosen model's free-tier conditions before activation.

Until a compliant host and inference path are verified, the correct state is **deployment blocked**. Do not substitute the operator's laptop, the Samsung A16, a Vercel Function, or an unapproved free trial.

Official references:
- Skyvern self-hosting: https://github.com/Skyvern-AI/skyvern/blob/main/docs/developers/self-hosted/overview.mdx
- Skyvern Docker requirements: https://github.com/Skyvern-AI/skyvern/blob/main/docs/developers/self-hosted/docker.mdx
- Vercel Function limits: https://vercel.com/docs/functions/limitations
- Vercel Hobby plan: https://vercel.com/docs/plans/hobby

## First pilot: one Nigerian school

### Input
- One school name and its official public website URL, supplied by the outreach operator.
- Scope: public pages only (home, about, contact, admissions).
- No login, CAPTCHA bypass, account creation, or form submission.

### Extraction schema
Return one record with:
- `organisation_name`
- `official_website`
- `country`
- `school_type`
- `public_contact_email` (only if visibly published)
- `public_phone` (only if visibly published)
- `contact_page_url`
- `admissions_page_url`
- `evidence_urls` (one or more exact pages supporting the fields)
- `evidence_notes`
- `confidence` (`high`, `medium`, or `low`)
- `review_required` (always true for the pilot)

### Agent instructions
1. Visit only the supplied domain and its normal public pages.
2. Do not infer email addresses, phone numbers, school status, ownership, student count, or decision-maker identities.
3. Distinguish official contact details from third-party directory details.
4. Record a source URL for every extracted contact field.
5. If the official website is unavailable or a field is absent, return null and explain why.
6. Stop on login walls, CAPTCHAs, unexpected downloads, redirects to unrelated domains, or requests for personal information.
7. Do not send email, submit a contact form, register, purchase, or change any data.

### Human acceptance checks
A reviewer verifies the official domain, school identity, each contact value against its evidence URL, and whether the contact channel is appropriate for institutional business enquiries. Only reviewed records may enter the outreach queue.

## Business prospecting extension

After the school pilot passes, reuse the same bounded workflow for international businesses, with country and business-category fields added. Keep schools and businesses in separate queues. Do not mix the 20-school Nigerian pilot with the 80-business international campaign.

## Security and operating controls

- Run one browser task at a time during the pilot.
- Set a small page/time limit and stop on unexpected navigation.
- Keep browser profiles isolated by purpose; never reuse a personal banking, email, or admin browser profile.
- Use public data only. Do not scrape behind authentication or collect sensitive personal data.
- Respect site terms, robots directives, access controls, and reasonable request rates.
- Preserve evidence URLs and timestamps; do not treat model confidence as verification.
- Require a human approval checkpoint before any external communication or form submission.
- Record failures explicitly; do not report a task as complete merely because the browser navigated.

## Acceptance criteria

The pilot is accepted only when all are true:
1. The self-hosted Skyvern service starts without a paid provider or cloud subscription.
2. A local model responds successfully, or the run is explicitly marked blocked rather than routed to a paid API.
3. The agent visits one operator-supplied official school website and extracts only visibly published contact details.
4. Every non-null contact field has a supporting official-page URL.
5. Missing fields remain null; no guessed email or phone is produced.
6. No email, form, account, payment, or public-data mutation is performed.
7. The output is reviewed and manually approved before entering the outreach queue.

## Current implementation status

| Component | Status |
|---|---|
| Architecture and separation of responsibilities | Documented in this runbook |
| Zero-spend and no-paid-fallback policy | Documented |
| Security and human-approval boundary | Documented |
| Pilot workflow and extraction contract | Documented |
| Skyvern installed on a user-controlled host | Not yet verified |
| Local inference configured | Not yet verified |
| Real school website browser run | Not yet executed |
| NSOS application integration | Not yet implemented |
| End-to-end outreach acceptance test | Blocked pending a working local Skyvern host and a supplied school URL |

This status is intentionally explicit. A Git commit containing this runbook is not evidence that a browser service is running or that a live school record has been verified.
