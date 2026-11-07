# NSOS External Gates Handoff — 7 November 2026

**Purpose:** Record the verified state of the external production-recovery gates and distinguish repository evidence from live operational acceptance.

## Executive status

| Gate | Current state | Evidence / next action |
|---|---|---|
| Manus custom-domain binding for `nsos.top` and school wildcard | BLOCKED — account access and platform-issued DNS values required | Domain registration is documented as active. The Manus production project must first issue the exact CNAME/A record. The DomainKing browser profile has no recorded signed-in session. |
| Public TinyURL redirect | BLOCKED — creation not completed | Required destination from `todo.md`: `https://nsos-system-uhkdscaf.manus.space`. Browser automation did not start because the connected TinyFish wallet balance is negative. Do not use the deprecated TinyURL public endpoint. |
| Isolated synthetic staging | BLOCKED — no verified isolated environment | The existing Vercel migration project is not a staging environment. The portable container PR is under CI validation; separate synthetic database, storage, OAuth configuration and provider stubs still need provisioning. |
| Reference-academy end-to-end validation | BLOCKED / NOT RUN | The existing OEA reference-academy scorecard is historical. The repository tracker still requires a synthetic end-to-end run before a PASS result can be issued. |

## Vercel migration project inspection

Read-only inspection of the connected Vercel project `nsos-vercel-migration` found:

- Project `live=false`.
- No project environment variables returned; hidden production environment count is zero.
- Only Vercel-generated domains are attached; no `nsos.top` custom domain is attached.
- SSO protection is enabled for all non-custom domains.
- All nine returned deployment records were in `ERROR`.
- The latest production deployment for commit `d0b9e12` failed because the configured build command `pnpm build:vercel` does not exist in `package.json`. Vercel suggested `pnpm build`.

**Interpretation:** Changing the build command alone would not establish a usable staging deployment. The project still lacks its environment configuration and a verified deployment/runtime integration. Do not connect production DNS or production data to this project.

## Portable container work

PR #61 adds:

- Multi-stage Node 24 Dockerfile.
- Docker Compose runtime with non-root user, read-only filesystem, dropped Linux capabilities and a health check.
- Safe environment template `docker.env.example`.
- Docker image build and synthetic process-health workflow.
- Deployment documentation covering secret continuity, staging isolation and rollback.

The first smoke run exposed a real packaging defect: the production bundle statically imports Vite, but the first runtime stage installed production dependencies only. The run failed with `ERR_MODULE_NOT_FOUND: Cannot find package 'vite'`. The Dockerfile was corrected to copy the locked dependency tree required by the current entrypoint. The corrected smoke run must pass before the image is accepted.

The current container health endpoint proves process availability only. It does not prove database connectivity, authentication, tenant isolation, provider integrations, or readiness for production.

## JWT_SECRET continuity rule

Do not point a new deployment using a replacement `JWT_SECRET` at the existing NSOS database. The current implementation derives encryption keys for provider credentials, Meta advertising tokens and school bank-account numbers from this secret.

- Existing database: requires the exact original secret, or a separately approved and tested data-recovery/migration plan.
- Isolated synthetic staging database: use a new staging-only secret and synthetic data.
- Never copy secrets into GitHub, issues, logs, build arguments, or this handoff.

## Required external approvals and execution

1. Confirm a browser session is available for the Manus production project and the DomainKing NSOS DNS account.
2. Add `nsos.top` in Manus and capture the exact platform-issued DNS values before editing DNS.
3. Preserve existing MX, SPF, DKIM, DMARC and unrelated records. Add only the exact required website record after the account holder approves the proposed change.
4. Create the TinyURL redirect only through the current supported TinyURL flow, then open the short URL and verify the exact destination.
5. Provision a separate synthetic staging environment: application host, database, object-storage namespace, OAuth client, observability destination and provider stubs.
6. Run the reference-academy workflow using synthetic accounts and data only. Capture test results for authentication, roles, tenant isolation, critical school workflows, health, backup/restore and rollback.
7. Keep production DNS, production credentials and the Manus production deployment unchanged until the staging acceptance and rollback evidence are reviewed.

## Stop conditions

Stop and report a blocker rather than guessing if:

- Manus does not provide a project-specific DNS target.
- DomainKing account access is unavailable.
- TinyURL requires a paid plan, API token, or account access that has not been supplied.
- Staging cannot be isolated from production data or live provider accounts.
- The original JWT secret cannot be recovered and the proposed database contains ciphertext encrypted with it.
- Any tenant-isolation, authorization, or backup/restore test fails.

**No DNS changes, TinyURL creation, production migration, live-provider actions, or production-data staging operations were performed during this handoff.**
