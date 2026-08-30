# NSOS Registration Welcome Email

**Status:** Implemented with durable, idempotent dispatch for newly created Google and passwordless-email accounts.

## Behaviour

After a verified Google callback or a consumed passwordless sign-in link creates a new external NSOS account, NSOS creates one durable `welcomeEmailDeliveries` record keyed uniquely to that user. The record stores only the normalised recipient address, lifecycle status, attempt count, provider message identifier, bounded failure text, and UTC timestamps. It does not store credentials, authentication tokens, learner records, or the email body.

The dispatcher claims only a queued record, sends one privacy-safe “Welcome to NSOS” message from the configured `notifications@nsos.top` sender, and supplies a stable provider idempotency key derived from the NSOS user identifier. A previously sent record is not sent again. Provider acceptance is recorded as `sent`; a rejected or timed-out request is recorded as `failed` without preventing account creation or session establishment.

## Boundaries

| Area | Implemented rule |
| --- | --- |
| Google sign-in | Welcome dispatch occurs only when the external identity resolver reports a newly created account. Existing Google identities do not receive a new welcome message on sign-in. |
| Passwordless email | The sign-in link continues to be sent before account verification. The welcome message is considered only after the link is consumed and a new account is created. |
| Duplicate prevention | A unique user delivery record, queued-to-sending claim, and stable provider idempotency key prevent repeat sends from repeated callbacks or retries. |
| Provider failure | The new account and session flow remain successful when the welcome provider is unavailable; the delivery record is marked failed and the privacy-safe operational event contains no recipient or credential data. |
| Content | The message contains only account-ready guidance and the NSOS sign-in destination. It does not contain passwords, one-time tokens, learner data, school data, or unverified claims. |
| Operations | No schedule, background loop, bulk send, parent message, learner invitation, inbound receiving, mailbox, or DNS change was added. |

## Validation

Focused tests cover successful dispatch, already-sent duplicate prevention, provider failure isolation, unsafe sender/origin rejection, and callback integration for newly created Google and passwordless accounts. TypeScript, lint, the focused authentication and welcome-email tests, and the production build passed. The repository-wide formatter check remains unsuitable as a gate because the pre-existing codebase contains legacy formatting outside this change; only the changed files were kept scope-limited.

The sender and domain were previously validated separately through one owner-approved operational test that Resend recorded as delivered. That evidence does not imply that every future message will be delivered; application records and provider events remain the source of truth for each message.

## Branded HTML template

The welcome message now includes an email-client-safe, table-based HTML layout using the NSOS pine and deep-pine palette, a compact wordmark header, a clear account-ready hierarchy, a high-contrast call-to-action, and a visible fallback URL. The existing public HTTPS logo is included only when it passes safe-URL validation; otherwise the template renders an accessible text wordmark. The plain-text alternative remains available and contains the same sign-in destination without credentials, tokens, learner data, or school data.

The branding change does not alter the durable queue, stable idempotency key, provider-failure isolation, Google/passwordless registration boundaries, or the rule that provider acceptance is not itself a delivery guarantee.

## Getting Started quick links

The welcome email now includes a concise **Getting started** section in both HTML and plain text. It links to the existing Overview, Admissions, Student records, Fees & finance, and Communications views using same-origin `/?view=` destinations. After sign-in, NSOS accepts a requested view only when the active role is permitted to access it; otherwise the existing role-aware fallback remains in effect. The query parameter is removed after it is consumed, and no new route or permission is created by the email.

These links are navigation aids only. They do not disclose tenant records, expose contacts, publish content, change fees, create invitations, or trigger delivery actions.

## Personalized greeting

The welcome email now addresses the account holder using the first token of the existing account display name. The value is HTML-escaped and restricted to a safe name pattern; accounts without a usable name receive the neutral greeting **“Hi there”**. Google registration passes the verified profile name when available, while passwordless registration uses the resolved account name and otherwise falls back neutrally.

The change does not include email addresses, credentials, learner records, tenant data, or provider secrets. It does not alter the durable delivery record, provider idempotency key, registration success behavior, or failure isolation.

Validation for this enhancement passed with **134 test files and 496 tests passed, with one intentional skip**, plus lint, TypeScript, diff checks, and the production build.
