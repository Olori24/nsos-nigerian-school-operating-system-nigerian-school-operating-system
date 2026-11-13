# NSOS Production Recovery and Release Verification

**Scope:** Recovery of the existing managed NSOS deployment and verification of a release after platform configuration is restored.

This runbook is separate from application feature work. A successful GitHub build does not prove that the managed production process can start or that production integrations are healthy.

## Current incident record

As of 7 November 2026, PR #59 is merged into `main`. A previous deployment checkpoint is available, but publishing it failed during production startup because the protected built-in `JWT_SECRET` variable was unavailable. The project Secrets API and UI reportedly reject edits to this protected variable. The owner has contacted hosting support and is waiting in its queue.

No application workaround, DNS change, traffic shift, or production code change is authorised by this incident record. Treat this as a platform configuration incident until fresh evidence shows otherwise.

## Why JWT_SECRET is a hard startup dependency

- `server/_core/env.ts` maps `JWT_SECRET` to the server-side `ENV.cookieSecret` value.
- `server/observability.ts` requires a non-empty session secret of at least 32 characters in production.
- `server/_core/index.ts` validates required production configuration before creating and listening on the HTTP server. Missing configuration causes startup to fail.
- `server/_core/sdk.ts` uses this secret to sign and verify HS256 session JWTs.

Do not weaken startup validation, introduce a development fallback, hardcode a secret, expose it to the client, or log its value. Those changes would conceal the platform failure and could compromise authentication.

## Platform support handoff

Ask hosting support to:

1. Confirm that the existing project's protected `JWT_SECRET` binding is present and readable by the production runtime.
2. Restore the original protected value if it is recoverable.
3. If the original value is irrecoverable, do not provision a replacement until the encrypted-data impact assessment and recovery/re-entry plan below have been approved. Then provision a new cryptographically random secret of at least 32 characters through the platform's supported protected-secret mechanism.
4. Confirm that the value is attached to the existing NSOS project and production runtime, not merely to a separate preview or migration project.
5. Confirm whether restoring or rotating this value requires a restart or republish, and whether successful injection can be confirmed without disclosing the secret.

Never request that support send the secret in email, chat, a ticket, screenshot, or log. Do not paste it into GitHub, this repository, a browser console, or a support conversation.

### Data-integrity impact if the secret is rotated

The current implementation derives multiple encryption keys from the same configured application secret:

- `server/db/core.ts` derives the provider-configuration encryption key from `ENV.cookieSecret`. Stored provider credentials include payment, SMS, WhatsApp and email API keys, secret keys, and webhook secrets.
- The same file derives a separate bank-account encryption key from `ENV.cookieSecret` for stored Nigerian school bank account numbers.
- Meta advertising access tokens are also encrypted with `sealProviderCredentials` and stored in `schoolAdvertisingAccounts` by `saveMetaAdvertisingAccount`. Losing decryption access makes the connected advertising account and related campaign-preparation workflows unusable until the token is securely re-entered and revalidated.
- SMS webhook verification reads the stored provider credentials, so loss of decryption access can also prevent verification.

If `JWT_SECRET` is replaced, ciphertext encrypted under the previous derived keys will not be decryptable with the replacement keys. Do not assume that restoring application startup means stored provider, Meta advertising, or bank-account data remains usable.

**Mandatory gate before any replacement/rotation:**

1. Inventory affected encrypted records by data class: provider configurations, Meta advertising accounts in `schoolAdvertisingAccounts`, and school bank-account records. Record counts and non-sensitive school/record identifiers and status only; do not export or expose plaintext credentials, access tokens, or full account numbers.
2. Identify every school and integration depending on those records, including payment processing, SMS delivery and webhook verification, WhatsApp/email providers, Meta advertising connections, and bank-account display or payout workflows.
3. Define and approve an operable recovery path for every affected provider channel and every affected school record. If the original key cannot be restored, plan secure credential re-entry, token revocation/rotation where appropriate, bank-detail re-entry and verification, and provider reconnection tests. For each provider channel, submit the complete required credential bundle in one save; do not assume separate partial saves accumulate. The current save operation replaces the encrypted credential bundle when credentials are supplied. Keep the channel disabled or otherwise unavailable until the complete bundle has been re-entered and the required checks pass. Verify that each channel can be recovered independently; a successful save for one channel must not be taken as proof that all channels are recoverable.
4. Account for partial-success behavior during recovery: `saveProviderConfiguration` writes the selected channel before returning `listProviderConfigurations`, which decrypts all configured channels. A save can therefore persist successfully and still return an error if another channel contains ciphertext that cannot be decrypted. Do not treat list/status metadata or credential-presence flags as proof that a replacement was fully persisted. For an enabled external provider, `providers.testConnection` checks the selected channel without listing other channels and can verify the provider authentication path; however, success does not verify every credential field or the full write. For fields not exercised by that connection test, including SMS webhook-signing secrets, do not test by temporarily enabling a production channel. Verify the signing secret only in an isolated synthetic staging environment: use a dedicated synthetic school, synthetic provider credentials, and a provider stub or enforced outbound-network block; set the staging SMS channel to `ready` only for the signed synthetic webhook request, verify the expected response and test-message-only effect, then return the channel to `disabled` and confirm the outbound block remains in place. A `draft` or `disabled` channel intentionally rejects the webhook, so that rejection is not evidence that the signing secret is wrong. The synthetic staging check verifies only the synthetic school's synthetic signing secret; it does not verify the production school's saved `webhookSecret`. Record production webhook verification as NOT RUN until a separately approved check verifies the actual production configuration without exposing the secret. Keep the production SMS channel unavailable until that production-specific verification passes under an owner-approved controlled procedure. If isolated staging or the required outbound block is unavailable, record the synthetic staging check as NOT RUN as well. If any check is inconclusive, stop and follow the approved recovery plan rather than retrying blindly. Do not expose decrypted values during these checks.
5. For any proposed cryptographic migration, require a separately reviewed and tested migration design with explicit backup, access-control, rollback, and verification steps. Do not improvise a multi-key fallback or attempt ad hoc decryption/re-encryption during this incident.
6. Obtain explicit owner approval for the complete recovery plan before a replacement provider provisions a replacement secret or anyone initiates a rotation.

Never place plaintext credentials, full bank account numbers, secret values, or decrypted exports in GitHub, logs, tickets, or this runbook.

### Session impact if the secret is rotated

NSOS signs and verifies session JWTs with the configured secret. Replacing it makes previously signed session tokens fail verification unless the old signing key remains supported by an explicitly designed rotation mechanism. Plan for existing users to sign in again after replacement. Do not implement an ad hoc multi-key fallback during incident recovery.

## Pre-publish checks

Before republishing the existing checkpoint:

- Confirm the support response identifies the correct NSOS project.
- Confirm the protected secret is restored in the production runtime. If replacement is unavoidable, first confirm the encrypted-data inventory and approved recovery/re-entry plan are complete and explicitly authorised.
- Confirm the value meets the application's 32-character minimum without revealing or copying it into logs.
- Before any replacement, confirm affected provider credentials and bank-account records have an approved preservation, migration, or secure re-entry path; do not proceed on the basis of session recovery alone.
- Confirm the other required production setting is present: `DATABASE_URL`.
- Confirm the intended checkpoint/commit is the current reviewed release and no unrelated changes are included.
- Do not run schema migrations, alter DNS, attach domains, change traffic routing, or modify provider credentials as part of this secret-only recovery.

## Post-publish verification

Record timestamp, deployment/checkpoint identifier, commit SHA, and evidence for each check.

1. **Process startup:** managed deployment reports a healthy running process; startup logs contain no missing-environment or listen errors and contain no secret values.
2. **Health endpoint:** request `/healthz`; expect HTTP 200 and `{"status":"ok"}`. This endpoint confirms process health only; it does not prove database or authentication health.
3. **Public routes:** load `/`, `/start`, and a valid public school route. Confirm static assets load and there are no fatal browser errors.
4. **Authentication:** complete a real supported sign-in, confirm the browser receives the expected secure session cookie, load `/app`, refresh, and verify the authenticated session remains valid.
5. **Session rejection:** verify unauthenticated access to protected procedures is rejected. Do not test with real student or guardian records.
6. **Database:** perform a safe read-only authenticated request that exercises the configured database connection. Do not run migrations or write synthetic production records for this check.
7. **Tenant and role boundaries:** verify a user can access only the active tenant and permitted role-scoped views. Use approved test accounts and non-production data where possible.
8. **Critical workflows:** smoke-test admissions intake/review, school workspace navigation, academic read views, finance read views, and school website preview. Do not publish a school site, issue a payment, send a live message, or alter student records during smoke testing.
9. **Email/provider integrations:** verify configuration/readiness separately. Do not infer sender verification or successful external delivery from a healthy application process.
10. **Monitoring:** inspect server errors, authentication failures, request latency, and available operational telemetry after release.

## Release decision

- **PASS:** process starts; health endpoint responds; public routes render; real authentication works; protected requests are denied when unauthenticated; safe database reads work; tenant/role checks hold; no critical runtime errors appear.
- **CONDITIONAL:** application starts but an external provider, verified sender, or separately controlled domain remains unavailable. Keep that capability labelled unavailable and do not claim full production readiness.
- **FAIL / ROLLBACK:** startup, authentication, database access, tenant isolation, or critical application workflows fail. Stop rollout and restore the last known-good managed checkpoint using the platform's supported rollback process. Do not change DNS or route traffic to an unverified deployment.

## Evidence and change control

Keep the support ticket reference, support confirmation, deployment identifier, commit SHA, test timestamps, and redacted logs in the incident record. Never store secret values, access tokens, session cookies, personal student data, or unredacted provider credentials in this document or GitHub.

This runbook does not assert that the current checkpoint is live or production-verified. Update incident status only after the platform reports successful deployment and the checks above have been executed.
