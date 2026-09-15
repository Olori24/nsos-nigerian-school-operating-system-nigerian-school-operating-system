# NSOS Automation Engineering Standard

NSOS already contains automation-oriented workflows and approval-first tooling. New automation must preserve those safety properties.

## Rules

1. **Idempotent mutations** — retried requests must not duplicate records, payments, messages or provisioning.
2. **Explicit authority** — automation operates only within the permissions of the initiating actor and configured policy.
3. **Tenant scoped** — every tenant-owned read/write is constrained by the school boundary.
4. **Approval first for high impact** — money movement, destructive actions, publication, external messaging and bulk mutations require the appropriate approval boundary.
5. **Bounded retries** — transient failures retry; permanent failures become actionable failures rather than infinite loops.
6. **Observable execution** — important automated work records enough context to explain what happened without leaking secrets.
7. **Replay safe** — webhook and background processing must tolerate duplicate delivery.
8. **Provider independent** — business rules remain in NSOS; external providers are adapters.
9. **Cost bounded** — scheduled and AI work must have explicit frequency/volume limits.
10. **Recoverable** — failed automation must leave a clear retry/recovery path.

## Existing NSOS patterns

Migration and builder workflows already use idempotency keys and approval boundaries. AutomationDesk provides an application-level automation surface. The standard formalises these patterns for future jobs and integrations.
