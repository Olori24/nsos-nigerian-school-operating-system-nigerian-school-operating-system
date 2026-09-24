# NSOS Provider Adapter Standard

External providers are replaceable infrastructure. NSOS domain code must not depend directly on provider-specific response shapes or credentials.

## Applies to

- payments
- email
- SMS/WhatsApp
- object storage
- AI/model providers
- maps/geocoding
- identity/KYC
- analytics

## Adapter contract

Each provider integration should expose an NSOS-owned interface containing only the business capabilities NSOS needs.

```text
NSOS domain
    ↓
NSOS interface
    ↓
provider adapter
    ↓
external provider
```

## Required properties

- explicit configuration validation
- timeout
- bounded retries where safe
- idempotency for repeatable mutations
- normalized errors
- structured operational logging
- provider request correlation ID when available
- no secret leakage in logs
- testable fake adapter
- documented free/low-cost alternative where practical
- migration/exit notes

## Payment rule

Payment provider webhooks must be treated as untrusted external input. Verify signatures, validate event shape, enforce tenant ownership, make processing idempotent, and record an auditable outcome before changing financial state.

## Messaging rule

Outbound communication must be permission-aware, rate-limited, retry-safe, and observable. A provider outage must not corrupt the underlying school record.

## Storage rule

Application code should use object-storage capabilities through NSOS storage services. Provider-specific URLs, bucket assumptions and credential handling stay outside domain modules.

## AI rule

The existing `server/_core/llm.ts` is the canonical model boundary. New AI features must not create a second direct provider path.
