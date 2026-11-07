# NSOS Production Recovery and Release Verification

**Scope:** Recovery of the existing managed NSOS deployment and verification of a release after platform configuration is restored.

This runbook is separate from application feature work. A successful GitHub build does not prove that the managed production process can start or that production integrations are healthy.

## Current incident record

As of 7 November 2026, PR #59 is merged into `main`. A Manus checkpoint is available, but publishing it failed during production startup because the protected built-in `JWT_SECRET` variable was unavailable. The project Secrets API and UI reportedly reject edits to this protected variable. The owner has contacted Manus support and is waiting in its queue.

No application workaround, DNS change, traffic shift, or production code change is authorised by this incident record. Treat this as a platform configuration incident until fresh evidence shows otherwise.

## Why JWT_SECRET is a hard startup dependency

- `server/_core/env.ts` maps `JWT_SECRET` to the server-side `ENV.cookieSecret` value.
- `server/observability.ts` requires a non-empty session secret of at least 32 characters in production.
- `server/_core/index.ts` validates required production configuration before creating and listening on the HTTP server. Missing configuration causes startup to fail.
- `server/_core/sdk.ts` uses this secret to sign and verify HS256 session JWTs.

Do not weaken startup validation, introduce a development fallback, hardcode a secret, expose it to the client, or log its value. Those changes would conceal the platform failure and could compromise authentication.

## Platform support handoff

Ask Manus support to:

1. Confirm that the existing project's protected `JWT_SECRET` binding is present and readable by the production runtime.
2. Restore the original protected value if it is recoverable.
3. If the original value is irrecoverable, provision a new cryptographically random secret of at least 32 characters through the platform's supported protected-secret mechanism.
4. Confirm that the value is attached to the existing NSOS project and production runtime, not merely to a separate preview or migration project.
5. Confirm whether restoring or rotating this value requires a restart or republish, and whether successful injection can be confirmed without disclosing the secret.

Never request that support send the secret in email, chat, a ticket, screenshot, or log. Do not paste it into GitHub, this repository, a browser console, or a support conversation.

### Session impact if the secret is rotated

NSOS signs and verifies session JWTs with the configured secret. Replacing it makes previously signed session tokens fail verification unless the old signing key remains supported by an explicitly designed rotation mechanism. Plan for existing users to sign in again after replacement. Do not implement an ad hoc multi-key fallback during incident recovery.

## Pre-publish checks

Before republishing the existing checkpoint:

- Confirm the support response identifies the correct NSOS project.
- Confirm the protected secret is restored/provisioned in the production runtime.
- Confirm the value meets the application's 32-character minimum without revealing or copying it into logs.
- Confirm the other required production settings are present: `VITE_APP_ID`, `DATABASE_URL`, and `OAUTH_SERVER_URL`.
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
