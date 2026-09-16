# NSOS Automation Engineering Standard

Every automation must have a clear tenant, initiator, authority, status lifecycle, idempotency boundary, bounded retry policy, safe failure record, and recovery path. High-impact steps remain approval-first.

Automations must not bypass existing role checks, tenant isolation, provider health checks, or final confirmation controls. They must remain observable and replay-safe without converting failed actions into silent successes.

| Required field              | Purpose                                                                    |
| --------------------------- | -------------------------------------------------------------------------- |
| Job and tenant identifiers  | Establish one accountable, tenant-scoped execution boundary.               |
| Initiator and authority     | Identify who requested the action and why it is permitted.                 |
| Status and timestamps       | Support operational review without exposing secrets.                       |
| Idempotency and retry count | Prevent duplicate execution and uncontrolled retry loops.                  |
| Failure and recovery record | Preserve a deterministic recovery path rather than an inferred completion. |
