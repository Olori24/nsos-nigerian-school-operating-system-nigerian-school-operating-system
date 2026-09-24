# NSOS Staged Load-Test Prerequisites

**Status:** Not executed. This runbook defines the evidence required before any 50,000-user capacity statement.

> **Safety boundary:** Load tests must run only against an isolated staging deployment with synthetic schools, memberships, learners, guardians, invoices, documents, and provider credentials. They must not call live SMS, email, payment, DNS, storage, or AI-provider accounts unless a dedicated non-production provider environment is explicitly configured.

## Required environment evidence

| Requirement | Acceptance evidence | Why it is required |
| --- | --- | --- |
| Isolated application and database | A separately identified deployment, database, object-storage namespace, and secrets set. | Prevents test activity from changing or exposing real school records. |
| Synthetic data only | A reproducible generator and a data inventory showing no production export was used. | Protects children, guardians, staff, financial data, and institutional material. |
| Observable runtime | Request correlation events plus retained latency, error, resource, database-pool, and provider-dependency measurements. | Makes a pass/fail decision reproducible rather than anecdotal. |
| Provider simulation | Non-production or stubbed email, SMS, payment, storage, and AI responses with controlled failure cases. | Exercises degraded operation without sending or charging anyone. |
| Abort authority | Named operator, documented stop conditions, and tested kill/rollback steps. | Limits blast radius if error rate, resource saturation, or data growth exceeds limits. |

## Built-in staging safety probe

`scripts/measure-health-load.mjs` is a small, read-only health-check probe for the first staging smoke stage. It now fails closed: it requires `NSOS_LOAD_TEST_APPROVED=true`, an explicit `NSOS_STAGING_AUDIT_URL`, HTTPS, and a hostname containing `staging`, `stage`, `test`, or `sandbox`. It refuses the live NSOS host, has no production default, limits runs to 200 requests and 25 concurrent requests, and sends no mutation traffic. It is **not** a 50K benchmark and must not run until the environment-evidence table is satisfied.

## Workload sequence

The initial benchmark model represents 50,000 registered users, about 10,000 daily active users, 2,000 peak concurrent sessions, and up to 500 concurrent API requests. These are test inputs, **not confirmed NSOS capacity**.

| Stage | Synthetic workload | Measurements required before progressing |
| --- | --- | --- |
| 0 — smoke | Authorized sign-in, owner dashboard, admissions read/review rejection, staff/teacher read, guardian/student portal read, private-file denial, and public website access. | Correct authorization outcomes, no data leakage, no unexpected 5xx responses. |
| 1 — low | 25–50 concurrent sessions with a realistic read-heavy mix. | p50/p95/p99 latency, 4xx/5xx mix, database connections, memory, CPU, and request-event completeness. |
| 2 — medium | 100–250 concurrent sessions with controlled admissions, attendance, finance-read, and review mutations. | Idempotency outcomes, lock/deadlock behavior, query plans, rate-limit behavior, and provider-stub latency. |
| 3 — peak rehearsal | Progressively approach the target concurrency only if Stage 2 meets pre-agreed service objectives. | Sustained tail latency, error rate, autoscaling behavior, database saturation, storage behavior, and recovery after controlled provider failures. |
| 4 — recovery | Restore a disposable staging dataset and rehearse migration rollback/redeploy. | Recorded RPO/RTO observations and documented corrective actions. |

## Required workload mix

The test plan must include tenant-scoped dashboard reads, student and admissions list reads within the enforced limits, attendance and results reads, finance reads, authorization failures, public website access, approved CSV import validation, private File-to-School access denial, and controlled provider timeouts. Any mutation must use idempotency keys or an explicitly resettable synthetic dataset.

## Stop conditions

Stop the current stage immediately if authorization or data-isolation behavior fails, if unexpected 5xx responses persist, if a database pool saturates, if resource pressure threatens the environment, if synthetic records enter a non-test service, or if a provider call attempts to send, charge, or publish externally. Record the request IDs, stage, workload mix, and remedial action; do not continue by reducing monitoring or suppressing failures.

## Capacity verdict rule

NSOS may describe a measured capacity only after the relevant stage has a dated report covering p50/p95/p99 latency, error rate, concurrency, request volume, database and runtime utilization, provider behavior, object-storage behavior, and recovery observations. Until then, the correct status is **UNKNOWN**, not pass, fail, or estimated capacity.
