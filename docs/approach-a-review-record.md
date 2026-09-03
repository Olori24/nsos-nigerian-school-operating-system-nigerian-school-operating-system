# Approach A Consent and Owner-Control Review

## Review outcome

The Approach A controls were reviewed against the current NSOS source and regression suite. The review used no live recipient list, did not change any subscription preference, and did not call the email provider.

## Private draft prepared for review

The following draft is intentionally recorded as review content only. It is not persisted as a campaign record, has no recipient list, and is not approved or sent.

| Field | Review value |
|---|---|
| Title | NSOS platform improvements |
| Subject | Product improvements from NSOS |
| Body | We are continuing to improve NSOS for dependable school operations. Future product updates will be shared only with users who explicitly opt in. |
| Recipients | None selected |
| Status | Review-only; not persisted, approved, or sent |

## Control findings

The account preference control is protected and user-scoped. Its available sources include account settings, registration, and the signed unsubscribe link. The default subscription state is unsubscribed, and consent history is stored separately from the current preference.

The unsubscribe endpoint accepts only a signed, expiring token and records an explicit opt-out. The campaign list, draft, approval, and send procedures are restricted to the configured platform owner. Approval and send both require a literal confirmation value, and the send path suppresses non-subscribers and avoids already-sent deliveries through the durable delivery record.

The campaign console states that creating or approving a campaign does not send it, and the final send action presents an irreversible-action confirmation. No in-process scheduler was added, so review activity cannot silently become background delivery.

## Evidence

The source assertions and safeguard checks are maintained in `server/marketing.test.ts`. The full project suite and the isolated registration harness are run with Vitest. The review record is deliberately descriptive rather than a database seed or production campaign mutation.
