# NSOS 100K Production-Readiness Audit

**Audit date:** 20 August 2026  
**Scope:** Live entry surface, core server controls, authentication, multi-tenant boundary enforcement, production dependency posture, database metadata, resilience paths, and bounded public-health performance measurement.

> **Verdict: YELLOW — CONDITIONALLY READY FOR LIMITED REAL-TENANT USE; 100K TARGET NOT VERIFIED.**
>
> The platform has meaningful application security controls and passing regression coverage, but no realistic-volume staging dataset, observability baseline, authenticated workflow load test, or production infrastructure metrics exist to prove a 100,000-user workload. This audit does not label unmeasured capacity as verified.

## Evidence classification

| Label | Meaning in this audit |
| --- | --- |
| **MEASURED** | Directly observed from the deployed service, database metadata, or an executed test command. |
| **INSPECTED** | Confirmed through current source and regression tests. |
| **UNKNOWN** | Not exposed by the present environment or not tested safely. |

## Measured results

| Measure | Result | Classification | Interpretation |
| --- | ---: | --- | --- |
| Production dependency audit | 0 known production-package advisories across 508 dependencies | **MEASURED** | Clean snapshot at audit time; this is not a substitute for ongoing scanning. |
| Current database footprint | 3 schools, 4 users, 3 memberships; largest observed table was `rateLimitBuckets` at 844 approximate rows | **MEASURED** | The live dataset is far below a realistic school-network or 100K-user volume. |
| Public health workload A | 50 requests, 10 concurrent, 0 errors, 5.22 requests/sec, p50 674.60 ms, p95 6,167.79 ms, p99 6,479.51 ms | **MEASURED** | Read-only health route only; likely includes a cold or proxy path. Not representative of authenticated business operations. |
| Public health workload B | 50 requests, 10 concurrent, 0 errors, 7.36 requests/sec, p50 665.50 ms, p95 3,429.42 ms, p99 3,483.14 ms | **MEASURED** | Immediate repeat improved the tail but remained slow for a minimal endpoint. |
| Automated regression suite | 48 files, 177 tests passed | **MEASURED** | Broad application policy coverage; not capacity proof. |
| Typecheck and production build | Passed | **MEASURED** | Build generated a main client bundle of approximately 2.1 MB before gzip; bundling warning remains. |

## Security and journey evidence

The live public landing page rendered the Google, passwordless-email, and existing-account sign-in choices. The browser rejected an invalid email locally before it could request an external email delivery. The source and tests confirm a browser-bound Google OAuth state, exact origin checks, verified-email requirement, single-use passwordless links, request rate limits, and failure responses that do not create sessions.

Live responses exposed `Strict-Transport-Security`, enforced CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, strict referrer policy, restrictive permissions policy, and no-store API caching. SMS webhooks inspect a provider signature before changing delivery state. Tenant procedures consistently obtain an active school membership before role-specific access checks. These are **INSPECTED** controls; only the public entry and invalid-email safeguard were exercised through the live browser in this audit.

## Remediations completed during this audit

| Area | Verified remediation | Verification |
| --- | --- | --- |
| External authentication | Added a 10-second deadline to Resend email, Google token, and Google userinfo requests. Timeout failures return controlled errors rather than holding a request indefinitely. | Timeout regression tests passed. |
| AI provider resilience | Added a fresh 30-second abort deadline for every AI-provider retry attempt. | LLM resilience test passed. |
| Autoscaled database access | Replaced implicit database-client creation with a bounded per-pod MySQL pool: five connections, five idle maximum, keepalive, and a queue capped at 20. | Database-pool resilience test and TypeScript validation passed. |

## Verified scale risks and remaining blockers

1. **100K capacity is untested.** There is no safe, realistic staging environment with production-like data volume, no authenticated workload benchmark, and no 100 → 1K → 5K progression. The highest directly exercised workload was **50 read-only health requests at 10 concurrent requests**.
2. **Database query shape needs a scale programme.** Several list and aggregation helpers return whole-school datasets or construct views through in-memory joins. Their impact cannot be quantified against the tiny live dataset, but they require pagination, query-plan review, and volume testing before a 100K claim.
3. **Observability is incomplete.** Current evidence does not include production CPU, memory, database connection saturation, query latency, queue depth, worker utilisation, distributed traces, or alert routing. Structured application logs exist in places, but there is no measured service-level baseline.
4. **Latency needs investigation.** The two bounded health measurements had p95 values of 6,167.79 ms and 3,429.42 ms. They are insufficient to diagnose the cause, but they do not support a low-latency 100K conclusion.
5. **Customer journey coverage is partial.** Public sign-in choice and invalid-input handling were exercised. A complete fresh-user journey through an actual email inbox or Google identity, school creation, onboarding, persisted operational action, logout, and return login was not safely completed during this audit because it would require authorised test identities and real provider delivery.
6. **Frontend delivery needs optimisation.** The production build warns that the main JavaScript bundle exceeds 500 kB after minification. Route-level lazy loading and bundle analysis should precede acquisition campaigns.
7. **Cost model is unknown.** No current provider bills, negotiated database limits, delivery-provider unit costs, traffic profile, retention policy, or AI-usage envelope were available. A 1K/10K/50K/100K operating-cost estimate would be speculative and is therefore not included.

## Required path to a verified 100K target

1. Create a separately authorised staging environment with production-equivalent database settings, observability, and anonymised or user-supplied test data; do not copy live learner or family data.
2. Define workload mixes for registration, sign-in, school onboarding, admissions submission, dashboard reads, attendance, finance, and AI/document operations. Run progressive tests from 100 through 100,000 users while recording p50/p95/p99, errors, CPU/memory, database connections, query latency, and provider limits.
3. Add pagination and query-level load tests to whole-school list and aggregation endpoints before raising concurrency.
4. Instrument structured request logs, error rates, latency histograms, database pool saturation, external-provider timeout counts, and alerting. Add a safe dependency readiness check with short timeouts.
5. Split the largest client routes and re-measure mobile load and Core Web Vitals on representative Nigerian network conditions.

## Final answer to the audit question

**If 100,000 users arrived tomorrow, what would break first?** It is **UNKNOWN** because no realistic 100K workload has been measured. The first observed concern is slow tail latency even on a minimal public health route. The first source-inspected risk path is unpaginated, database-heavy school aggregation under constrained autoscaled compute. Both statements are evidence-led risk indicators, not claims of a reproduced production failure.
