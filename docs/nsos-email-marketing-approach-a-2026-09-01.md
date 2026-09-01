# NSOS Email Marketing — Approach A

## Status

Approach A is implemented as an **NSOS-managed, consent-based product-updates workflow**. No existing user was automatically enrolled and no marketing campaign was sent during implementation.

## User controls

Authenticated users see product-update preferences in Account & security. New subscriptions default to `unsubscribed`; a user must explicitly choose Subscribe to updates. NSOS records the user-scoped subscription state and a separate consent event with its source and UTC timestamp. The same control supports one-click unsubscribe from the account surface.

A signed, expiring unsubscribe token is also available for future campaign links. The public unsubscribe endpoint does not disclose account or subscription details, is safe to repeat, and rejects tampered or expired tokens. Unsubscribe is represented as suppression in the NSOS-managed list and is excluded from eligible campaign recipients.

## Owner controls

The platform-owner-only Communications campaign console supports drafting and listing campaigns, explicit approval, and a separate confirmed send action. Ordinary school owners/admins do not receive the platform campaign console; the client visibility check and server-side procedure both use platform-owner authorization.

A send is eligible only when a campaign is approved and the owner supplies the literal confirmation required by the procedure. Each opted-in user receives one durable delivery record per campaign, protected by a unique campaign/user key and a stable provider idempotency key. Sent and failed outcomes are recorded; provider failures do not silently become successful delivery. No in-process scheduler, background loop, or automatic campaign trigger was added.

## Message safety

Campaign HTML is escaped and accompanied by plain text. Messages use the configured NSOS sender and include an unsubscribe link generated from a trusted NSOS origin. Stored campaign records contain the draft content and operational status, but no API key, credential, or external audience copy is created. Recipient selection remains server-side and returns no recipient list to the owner UI.

This feature is product-update marketing, not transactional authentication. Formal consent wording, retention, and applicable Nigerian privacy/marketing requirements should be reviewed by qualified counsel before a public campaign. Resend provider charges may apply when an owner intentionally sends a campaign.

## Validation

Focused Approach A regression passed. Full validation passed with **135 test files, 502 tests passed, and 1 intentional skip**, plus lint, TypeScript, production build, and diff checks. No campaign send was performed as part of implementation validation.
