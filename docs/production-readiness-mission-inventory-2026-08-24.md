# NSOS Production-Readiness Mission Inventory

**Audit baseline:** 24 August 2026  
**Scope:** Current repository, managed application runtime, database metadata, dependency scan, and executed validation commands.  
**Evidence labels:** **Measured** means a command, database query, or runtime response was observed during this mission. **Inspected** means the current source was reviewed. **Unknown** means it has not yet been safely measured or verified.

> **Post-remediation verdict: CONDITIONAL FAIL for real-school onboarding and UNKNOWN for 50K capacity.** The verified private-file access bypass and direct SheetJS advisories are remediated, selected operational lists and high-cost dashboard modules are bounded or split, and correlation-safe request events are added. Real email delivery remains externally blocked by the unverified sender, critical journeys have not been executed against an isolated staging environment, and no measured load or recovery rehearsal exists. These remaining gates prevent a broad launch or capacity claim.

## Measured baseline

| Area | Evidence | Status |
| --- | --- | --- |
| Repository state | `d4feb699` is the audited baseline; the mission tracker is the only uncommitted change at inventory creation. | **Measured** |
| Type safety | `pnpm check` completed before the test phase began. | **Measured pass** |
| Regression suite | `407/408` tests passed across `110/111` test files. The sole failing test confirms that `resend.dev` is absent from the connected Resend account. | **Measured fail** |
| Production build | The production build completed successfully. Its largest client JavaScript asset is `3,341.01 kB` uncompressed and `728.30 kB` gzip, with a bundle warning. | **Measured pass with risk** |
| Production dependency scan | `pnpm audit --prod` reports two high-severity advisories for direct dependency `xlsx@0.18.5`; the advisory report lists no patched package release. | **Measured fail** |
| Database footprint | The largest observed table is `rateLimitBuckets` with about `2,926` rows. The live dataset is not representative of multi-school operational scale. | **Measured insufficient** |
| HTTP protections | The runtime applies security headers, API no-store, same-origin mutation checks, shared request limits, and restricted body sizes. | **Inspected** |
| Public entry shell | The unauthenticated NSOS landing page rendered successfully after the final clean restart, including Google, passwordless-email, Manus sign-in, PWA-install, and theme controls. | **Measured pass** |

## Measured remediation update

| Area | Change and evidence | Current status |
| --- | --- | --- |
| Private object access | `/manus-storage/*` now accepts only safe, record-resolved school object keys. Unauthenticated, unknown, cross-tenant, inactive-member, teacher-to-private-knowledge, and unauthorized finance/document access receive the same non-enumerating response. Published website media remains the sole narrow public route. | **Remediated; 5 direct tests passing** |
| Admission review isolation | The review mutation now scopes its read and update by both `applicationId` and `schoolId`; router input passes the active school ID and does not write an audit event when the scoped mutation rejects. | **Remediated; 2 direct tests passing** |
| Spreadsheet advisory | `xlsx@0.18.5` was found in the client scheme-importer, not the server-only scan. The dependency is removed; the workflow now accepts bounded CSV only with a deterministic local parser and clearly marks `.xlsx` as temporarily unavailable. `pnpm audit --prod` now returns no known vulnerabilities. | **Remediated; 2 parser tests passing** |
| Operational list growth | Admissions and student lists retain their array contract but now default to 50 rows and enforce a 100-row server maximum. Full cursor pagination remains required before scale testing. | **Partially remediated** |
| Observability | Every HTTP response now receives a bounded correlation ID and emits a structured completion event with method, path without query data, status, duration, and slow-request flag. Production startup rejects absent core configuration; authentication and storage signing logs no longer emit raw provider bodies or errors. Metrics, tracing, retention, and alert delivery remain unverified. | **Partially remediated; 3 direct tests passing** |
| Frontend delivery | Selected owner/admin and specialist workspaces now use lazy imports behind an accessible loading boundary. The measured main asset fell from 3,003.34 kB to 2,170.37 kB uncompressed (**27%**) and from 613.09 kB to 504.77 kB gzip (**17%**). It still exceeds the build warning threshold. | **Improved; further splitting required** |
| CI security gate | GitHub CI now runs `pnpm audit --prod` before typecheck, tests, and build. | **Remediated** |

The latest complete suite result is **417/418 passing tests across 114/115 files**. The one failure is unchanged and external: the configured `resend.dev` sender domain is absent from the connected Resend account.

## Target workload model—not a capacity claim

The 50K target is modeled as **50,000 registered users**, approximately **10,000 daily active users**, **2,000 peak concurrent sessions**, and up to **500 concurrent API requests** across a mixed base of schools and learning institutions. The model must be exercised only in an isolated staging environment using synthetic data and separately provisioned credentials.

| Workload class | Expected peak behavior | Initial test focus |
| --- | --- | --- |
| Identity and onboarding | Sign-in bursts, passwordless requests, school creation, and membership resolution. | Session creation, origin enforcement, rate limits, active-membership revocation. |
| Core operations | Dashboard reads, admissions review, attendance, results, invoices, and portal views. | Tenant-filtered paging, query plans, selective columns, and authorization rejection. |
| Public traffic | Website views and admission submissions during enrolment periods. | Rate limits, body limits, upload validation, public/private boundary separation. |
| Files and AI | Bounded file ingestion, supervised analysis, and provider timeouts. | Object authorization, source provenance, input isolation, quotas, and failure recovery. |
| Provider activity | Email, SMS, payments, DNS, and storage dependencies. | Timeouts, idempotency, truthful delivery states, callback verification, and degraded-operation behavior. |

No throughput, latency, database saturation, or cost figure is claimed until this model is measured with recorded p50/p95/p99, errors, connection usage, CPU, memory, provider latency, and storage behavior.

## P0: launch blockers

| Finding | Evidence | Required remediation | Verification gate |
| --- | --- | --- | --- |
| Private object download bypass | The live `/manus-storage/*` proxy requests a signed object URL from an arbitrary supplied key and redirects without authentication, tenant lookup, object-record lookup, or membership authorization. The application stores admissions, finance, learning, and knowledge assets below guess-resistant but not access-controlled keys. | Replace direct object-key access with record-aware, tenant-authorized download procedures/routes; permit only explicitly public website media through a narrow public path. Remove private storage URLs from broadly returned records. | Direct cross-tenant and unauthenticated download attempts fail; owner/admin, linked portal, and public website paths have explicit tests. |
| High-severity SheetJS advisories | `xlsx@0.18.5` is a direct production dependency and `pnpm audit --prod` reports prototype-pollution and ReDoS advisories. No runtime import was found in the repository scan. | Remove the unused package and lockfile entries if no supported workflow needs it; otherwise isolate and replace the workflow with a maintained parser before accepting untrusted spreadsheets. | Production dependency audit has no high-severity SheetJS advisory; full regression passes. |
| Passwordless delivery cannot be verified | The configured `resend.dev` sender is not present in the connected Resend account, causing the external sender-authorization test to fail. | Require a verified sender domain/account configuration before enabling invitations or passwordless email for real users. This needs account-holder/provider action, not an application bypass. | The unchanged integration test passes against a verified sender. |

## P1: serious production risks

| Finding | Evidence | Required remediation |
| --- | --- | --- |
| Whole-school query growth | Current helpers include unbounded lists such as admissions and student retrieval, plus finance and learning workspaces that load multiple whole-tenant tables and create maps in application memory. | Add bounded pagination/cursors, explicit maximum result sizes, selective projections, tenant indexes, and query-level tests before load testing. |
| Incomplete observability | The runtime bootstrap has no request correlation IDs, latency histograms, database-pool telemetry, structured error pipeline, or alert routing. | Add privacy-safe structured request/error events, correlation IDs, bounded external-dependency metrics, and documented operational dashboards/alerts. |
| Frontend delivery size | The production build has a 3.34 MB main JavaScript asset before compression. | Introduce route/module-level lazy loading for rarely used workspaces and re-measure delivery on constrained mobile networks. |
| Startup/environment validation | Environment values default to empty strings and provider requirements are often discovered only when a route executes. | Add safe production startup validation for required core secrets while retaining truthful disabled states for optional integrations. |
| Auth/provider error pipeline | Authentication uses provider deadlines and validated OAuth state, but unexpected failures are sent to `console.error` without a correlation-safe production error event. | Route unexpected errors through the structured error pipeline without logging credentials, tokens, keys, full provider bodies, or unnecessary PII. |
| Scale evidence absent | Current data and past public-health measurements are not representative of 50K users, and no authenticated staging benchmark exists. | Establish isolated synthetic staging data, workload mixes, staged load tests, and resource telemetry before declaring capacity. |

## P2 and P3 work

| Priority | Work item | Status |
| --- | --- | --- |
| P2 | Core journey automation with authorized, non-production test identities and provider simulators. | Not yet measured. |
| P2 | Backup/restore and migration rollback rehearsal with documented RPO/RTO. | Unknown; needs platform and data-owner evidence. |
| P2 | Server-enforced billing/AI quota review against commercial plan entitlements. | Partially inspected; needs a dedicated attack and usage review. |
| P3 | Detailed cost model for 1K/10K/50K/100K users. | Unknown until provider, retention, and measured workload inputs are available. |
| P3 | 50K/100K capacity verdict. | Explicitly deferred until staged measurements exist. |

## Initial readiness scorecard

| Control area | Status | Basis |
| --- | --- | --- |
| Authentication | **FAIL** | Core controls are inspected, but real passwordless delivery cannot be verified with the current sender. |
| Authorization and multi-tenancy | **FAIL** | Procedure guards are inspected, but the storage proxy permits unscoped signed redirects. |
| Files | **FAIL** | File ingestion has several bounded paths, but the common download proxy is not record-authorized. |
| Dependency security | **FAIL** | Two high-severity production advisories are measured. |
| Database scale | **UNKNOWN** | Pool bounds exist, but live volume and query-plan/load evidence are insufficient. |
| API and frontend performance | **UNKNOWN** | Production build size is measured; authenticated performance and mobile Core Web Vitals are not. |
| AI safety | **UNKNOWN** | Approval-first boundaries are present in inspected features; quota, cost, and all-context attack evidence are incomplete. |
| Finance integrity | **UNKNOWN** | Existing policy coverage is not a substitute for an end-to-end mutation and idempotency audit. |
| Communications | **FAIL** | Sender verification is failing; provider delivery should not be treated as launch-ready. |
| Observability and error tracking | **FAIL** | No production-grade correlation, metrics, or alert pipeline is present in the inspected bootstrap. |
| Backups and recovery | **UNKNOWN** | No successfully rehearsed restore evidence was observed. |
| Deployment and CI/CD | **FAIL** | Current CI performs typecheck, tests, and build only; it does not gate dependency advisories, migration validation, security attack regressions, or readiness checks. |
| UX and critical journeys | **UNKNOWN** | Public shell and static coverage exist, but full authorized journeys have not been exercised end-to-end. |
| Billing and entitlements | **UNKNOWN** | Existing models require a dedicated server-side enforcement audit. |

## Remediation order

1. Close P0 private-file access and the unused vulnerable spreadsheet dependency.
2. Preserve the external sender failure as a launch gate until the account holder verifies a domain.
3. Add direct tenant, session, file, and AI-context attack regressions while auditing critical mutation paths.
4. Bound and profile high-volume query paths; split the largest client workspaces.
5. Add privacy-safe observability and error correlation before synthetic load testing.
6. Use an isolated synthetic staging environment for progressive measured workload tests. Do not use production student, family, financial, or operational records.

## Post-remediation release scorecard

| Control area | Status | Evidence and remaining gate |
| --- | --- | --- |
| Authentication and sessions | **Conditional** | Session verification and active-session checks are inspected; Google and email entry controls render publicly. Real passwordless delivery remains blocked by the Resend sender configuration. |
| Authorization and multi-tenancy | **Improved** | Server membership controls are inspected; private file paths and admission review now have explicit tenant-scope regressions. A full route-by-route authorization attack matrix is still outstanding. |
| Files | **Improved** | Private objects are record-authorized, File-to-School remains owner/admin reviewed, and CSV-only scheme import removes the vulnerable parser. Object deletion lifecycle and retention remain a policy/operations gate. |
| Dependency security | **Measured pass** | `pnpm audit --prod` reports no known vulnerabilities after removing SheetJS. |
| Database/API performance | **Unknown** | Operational list ceilings now exist, but there are no production-like query plans, connection telemetry, or staged latency measurements. |
| Frontend performance | **Improved, not launch-proven** | Main bundle reduction is measured; current 504.77 kB gzip main asset remains above the warning threshold and mobile performance has not been measured on target Nigerian networks. |
| AI, finance, and provider safeguards | **Conditional** | Existing approval-first controls are inspected and raw auth/storage error logging is narrowed. Cost/abuse testing, end-to-end finance idempotency testing, and provider-degradation drills remain unmeasured. |
| Observability and recovery | **Conditional** | Correlation-safe request events and startup checks are implemented. No hosted metrics, alerts, backup restore, or incident drill evidence exists. |
| CI/CD | **Conditional** | Typecheck, production dependency audit, full tests, and build run in CI. The unchanged verified-sender test correctly blocks a release until provider setup is completed. |
| 50K capacity | **UNKNOWN** | No isolated synthetic staging load, p95/p99 latency, error-rate, database/pool, memory, or provider-limit evidence exists. |

### Launch decision

NSOS is **not approved for broad real-school onboarding or any 50K-capacity claim** at this point. The next non-code gate is the owner-controlled Resend sender-domain verification. The next engineering gate is an isolated staging environment with synthetic data, observability retention/alerting, restore rehearsal, and progressive recorded workload tests. No domain, DNS, payment, sender, provider, or production data setting was changed during this mission.

The confirmation-gated sender sequence is documented in [`verified-email-sender-handoff.md`](./verified-email-sender-handoff.md); the fail-closed staging probe and staged evidence rules are documented in [`staged-load-test-prerequisites.md`](./staged-load-test-prerequisites.md).
