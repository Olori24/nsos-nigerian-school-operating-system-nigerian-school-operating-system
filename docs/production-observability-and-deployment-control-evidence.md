# NSOS Production Observability and Deployment-Control Evidence

**Status:** Source and configuration evidence only. This record does not claim backup completion, recovery success, external log retention, high-volume capacity, or provider health.

**Reviewed:** 5 September 2026

## Scope and boundary

NSOS runs as a managed stateless application. The safe source-level controls in this record are designed for that deployment model: request correlation, sanitized operational events, opaque unexpected-error responses, deterministic CI gates, no-store health responses, and release checkpoints. No infrastructure, provider account, database, storage namespace, backup job, recovery rehearsal, or load test was created or executed as part of this review.

## Implemented source-level controls

| Control | Evidence | Limitation |
|---|---|---|
| Request correlation | `server/observability.ts` accepts a bounded request identifier or creates an opaque UUID, returns `X-Request-ID`, and includes it in completion and unhandled-error events. | Correlation is application-level; an externally retained log sink and review cadence are not configured here. |
| Query-safe request logging | Request paths are stripped of query strings and bounded before logging. | Method, path, status, duration, and outcome are not a substitute for full trace infrastructure. |
| Sanitized error reporting | Unexpected errors are logged by safe error type and return `{ error: "internal_error", requestId }` without returning the exception message. | Error aggregation, alert routing, retention, and on-call ownership remain deployment concerns. |
| Liveness | `GET /healthz` returns a fixed service label, `ok` status, UTC timestamp, and `Cache-Control: no-store`. | Liveness does not test database, storage, provider, migration, or tenant readiness. |
| Runtime configuration guard | Production startup rejects missing core app, cookie, database, and OAuth configuration. | Configuration presence does not prove connectivity or correctness. |
| CI validation | `.github/workflows/ci.yml` runs locked installation, production dependency audit, lint, formatting, typecheck, MySQL 8.4 migration validation, deterministic tests, and production build. | Live provider health, staging recovery, backup restoration, and capacity remain intentionally outside default CI. |
| Deployment recovery point | Managed application checkpoints and reviewed migrations are retained as release artifacts. | A code checkpoint is not a tenant data backup and has not been treated as one. |

## Evidence still required before a stronger readiness claim

The following items remain **UNKNOWN**, not PASS:

1. A dated, externally retained tenant-data export and a successful restoration into an isolated disposable target.
2. A measured recovery point objective and recovery time objective for the managed database and object-storage references.
3. A provider-stubbed staging environment with a separately identifiable database, storage boundary, synthetic roles, abort authority, and redacted evidence location.
4. A staged progressive-load run with request latency, error rate, resource, database-pool, and provider-simulation measurements.
5. External log retention and a documented review cadence for correlation-safe operational events.
6. Alert routing, escalation ownership, and deployment rollback evidence for failed health or error conditions.

## Safe next actions

The next safe action is to obtain and review the independently verifiable non-production route and owner-approved evidence location for staging, backup, and recovery work. Until that route exists and is separately approved, NSOS must not run a recovery rehearsal, progressive-load workload, production export, provider action, or capacity claim.

## Validation record

The source-level observability and deployment controls are covered by the existing `server/observability.test.ts`, `server/healthz-route.test.ts`, and `server/ci-validation-gates.test.ts` suites. The broader project validation remains the release gate: locked dependency expectations, formatting, lint, TypeScript, deterministic tests, migration validation, and production build. Any future operational evidence must be dated, redacted, tied to an isolated target, and recorded separately from source-level pass results.
