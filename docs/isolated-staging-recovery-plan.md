# NSOS Isolated Staging and Recovery Readiness Plan

**Status:** Planning only. No staging application, database, storage namespace, provider credential, workload, recovery rehearsal, or capacity claim is being created or executed by this document.

## Boundary

The staging environment must be separately identifiable from NSOS production at the application, database, object-storage, secret, domain, and provider layers. It must contain synthetic schools, users, memberships, learners, guardians, invoices, documents, and messages only. Production exports, customer contact data, real credentials, live sender identities, payment accounts, DNS zones, and private learner records are prohibited.

The application must use deny-by-default provider adapters for email, SMS, payments, storage, and AI. Each adapter should return deterministic accepted, rejected, timeout, and malformed-response cases without reaching a live external account. Any future external provider test requires a separately approved non-production account and must not be folded into the harness described here.

## Readiness gates

| Gate | Evidence required | Current position |
|---|---|---|
| Application identity | Separate staging URL whose hostname clearly contains `staging`, `stage`, `test`, or `sandbox`; no production fallback | Not provisioned |
| Database identity | Empty, separately named database with a dedicated least-privilege principal and verified grants | Not provisioned; existing staging-provider work remains paused |
| Storage identity | Separate object-storage namespace with no production keys or objects | Not provisioned |
| Secrets | Staging-only secret set, with provider stubs enabled and production credentials absent | Not configured |
| Synthetic data | Reproducible generator and inventory proving no production records were imported | Not generated |
| Observability | Correlation-safe request events plus retained latency, error, resource, pool, and adapter measurements | Required before workload |
| Abort authority | Named operator, stop conditions, kill/rollback procedure, and evidence location | Must be named before execution |
| Recovery target | Disposable snapshot/restore target, migration rollback path, and dated RPO/RTO worksheet | Not rehearsed |

## Progressive sequence

The safe sequence is smoke validation first, then a low read-heavy workload, then a controlled medium workload, and only then a peak rehearsal if the previous stage meets pre-agreed service objectives. Mutation traffic must use idempotency keys or a resettable synthetic dataset. The recovery stage is separate: restore the disposable dataset, redeploy the tested migration state, and record observed RPO/RTO before any capacity conclusion.

The existing probe remains fail-closed. It must receive `NSOS_LOAD_TEST_APPROVED=true` and an explicit HTTPS staging URL, must reject the live NSOS host, and must remain bounded to its configured request and concurrency limits. The probe is a smoke tool, not evidence of 50,000-user capacity.

## Abort conditions

Stop immediately if authorization or tenant isolation fails, unexpected 5xx responses persist, database pools saturate, resource pressure threatens the environment, synthetic data reaches a non-test service, or an adapter attempts to send, charge, publish, or write to a production namespace. Preserve request IDs, stage, workload mix, timestamps, and corrective action. Do not continue by suppressing errors or reducing monitoring.

## Approval boundary

This plan does not authorize provisioning, billing, database creation, credential generation, provider connection, recovery execution, load generation, or publication of a capacity claim. Those activities require separate confirmation after the identity, least-privilege, synthetic-data, abort-authority, and evidence gates are independently verified.
