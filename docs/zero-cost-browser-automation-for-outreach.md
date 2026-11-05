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

The browser worker is NSOS-operated infrastructure. It must not depend on an operator's laptop or phone, and it must not be exposed as a public unauthenticated browser-control endpoint.

### Hosting assessment (5 November 2026)

The connected Vercel project `nsos-vercel-migration` is on the Hobby plan, reports `live: false`, and its latest production deployment is in an error state. Vercel Functions are request-scoped serverless compute, not a persistent Docker host for Skyvern's API, Chromium, database, and worker lifecycle. Vercel Hobby is documented for non-commercial/personal use, so it is not the selected NSOS commercial worker host.

The NSOS GitHub repository is public. GitHub documents standard GitHub-hosted runners for public repositories as free and unlimited, with an Ubuntu standard runner providing 4 CPUs, 16 GB RAM, and 14 GB SSD. Skyvern's current self-hosting documentation supports Python local mode and a local Ollama model. The Qwen2.5-VL 3B Ollama model is a 3.2 GB vision model. This makes an **ephemeral GitHub Actions batch worker** the best zero-spend pilot candidate, not a permanently running service.

### Implemented pilot worker

The branch now includes:

- `.github/workflows/nsos-skyvern-outreach-pilot.yml`: manually dispatched, one-target-at-a-time workflow on `ubuntu-24.04`.
- `scripts/nsos-skyvern-outreach-pilot.py`: Skyvern local-mode task runner with Qwen2.5-VL 3B via Ollama.
- URL validation requiring HTTPS, rejecting private/local/IP-literal targets and DNS results that resolve to non-public addresses.
- A bounded 10-step task and 10-minute execution timeout.
- Public pages only, same-host navigation instructions, and a structured evidence schema.
- No login, CAPTCHA bypass, form submission, email, registration, downloads, payment, or website mutation.
- Redacted run output: actual email and phone values are not printed, uploaded as artifacts, or persisted by this pilot.
- One ephemeral runner per run; it is destroyed when the job finishes.

The workflow is deliberately manual. It has no schedule and does not connect to the NSOS outreach queue. The public repository's workflow metadata and target hostname are visible to repository readers; therefore this pilot must only be used with public organisation websites and non-confidential URLs. It must never receive credentials, private prospect data, or session cookies.

### Production integration gate

A GitHub Actions runner is ephemeral, not an always-on worker. The pilot proves whether local Skyvern and local inference can execute in the available zero-cost compute; it does not by itself provide durable queue processing or private storage.

Before production outreach integration, NSOS must provide a secure result sink and job-claim protocol. Preferred design: a short-lived GitHub Actions OIDC identity scoped to this exact repository/workflow/ref, verified by an NSOS API endpoint; the endpoint then validates the job, stores evidence in the NSOS ledger, and returns only the next approved task. Do not add a long-lived database password or application secret to a public repository. Until that endpoint and private result persistence exist, the pilot's extracted contact values remain in runner memory and are discarded.

No automatic schedule, paid model provider, Skyvern Cloud account, proxy, CAPTCHA service, or paid infrastructure is enabled.

Official references:
- Skyvern self-hosted and local mode: https://github.com/Skyvern-AI/skyvern/blob/main/docs/developers/self-hosted/overview.mdx
- Skyvern SDK local mode and task API: https://github.com/Skyvern-AI/skyvern/blob/main/docs/sdk-reference/overview.mdx
- GitHub Actions free public-repository runners: https://docs.github.com/en/actions/concepts/billing-and-usage
- GitHub runner specifications: https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job
- Ollama Qwen2.5-VL 3B: https://ollama.com/library/qwen2.5vl:3b
- Vercel Function limits: https://vercel.com/docs/functions/limitations
- Vercel Hobby plan: https://vercel.com/docs/plans/hobby

## First pilot: one Nigerian school

### Input
- Selected existing outreach prospect: New Horizon Private Schools, Abuja.
- Pilot target URL: https://newhorizonprivateschools.com/ (official homepage).
- Preliminary public-page references: /about, /contact, and /admissions. These are candidate pages from web research, not yet confirmed by a Skyvern browser run.
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
| Skyvern local-mode worker code and workflow | Added; execution not yet verified |
| Local Qwen2.5-VL inference workflow configuration | Added; model startup not yet verified |
| New Horizon Private Schools, Abuja pilot target selected | Verified against existing outreach prospect list and official website |
| Real school website browser run | Pending PR merge and manual workflow dispatch |
| NSOS application / outreach-queue integration | Blocked pending authenticated OIDC result sink and private persistence |
| End-to-end outreach acceptance test | Blocked pending workflow execution and secure result integration |

This status is intentionally explicit. A Git commit containing this runbook is not evidence that a browser service is running or that a live school record has been verified.
