# NSOS Provider Adapter Standard

Payments, messaging, storage, email, AI, identity, and country-specific integrations must be accessed through explicit service boundaries where practical. Product workflows depend on NSOS-domain contracts, not vendor-specific response shapes.

Provider adapters must validate credentials safely, avoid persisting secrets in application records, expose sanitized status, use idempotency for outbound operations, distinguish submission from confirmed delivery, and preserve a failure-isolated path. A provider response alone must not change an academic, finance, access, or credential outcome without the required application controls.
