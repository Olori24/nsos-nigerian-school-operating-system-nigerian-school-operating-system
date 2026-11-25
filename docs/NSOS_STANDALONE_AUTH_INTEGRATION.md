# NSOS Standalone Authentication Integration

Status: Google account-linking implementation added; CI and focused verification pending. Not approved for production.

## Baseline

- Integration branch is based on current `main` at `44292d393c565c933ac52281d5d1482afca68250`.
- Current production deployment also points to `44292d393c565c933ac52281d5d1482afca68250`.
- The connected Vercel project has no Production environment variables configured.
- Current main contains Google OAuth and passwordless email routes, but its SDK still constructs the Manus OAuth service and reads `OAUTH_SERVER_URL` / `VITE_APP_ID`.
- Current main rejects attaching a new provider to a legacy account based on matching email alone. This branch now adds explicit, session-bound Google account linking.

## Integration decisions

1. Preserve existing NSOS user IDs, roles, school memberships, tenant records, and encrypted data.
2. Never auto-link a legacy account based only on a matching verified email.
3. Require an authenticated, active NSOS session before linking Google to an existing account.
4. Bind the link attempt to the initiating user ID and session ID; revalidate both after Google's callback.
5. Reject an identity already linked to a different NSOS user.
6. Keep Google sign-in and email magic-link sign-in as the intended standalone methods.
7. Preserve the existing JWT signing/encryption key until a verified recovery or decrypt/re-encrypt plan exists.
8. Keep all work isolated to this branch. No merge, production environment changes, database migration, DNS changes, or deployment is authorized by this PR.

## Source candidates reviewed

- `fix/remove-manus-native-google-auth` (`fa9a05bd213480fd964f1e580ce5368b0ff84b46`): removes the Manus client from the standalone staging path and contains provider-neutral session signing, but is 21 commits behind the historical main comparison point and its identity recovery logic must be reconciled.
- PR #63 (`78dab698ec37d7192b79eb3fd7a77f5024a5fb1b`): contains explicit session-bound identity linking and tests, but is 39 commits behind the historical main comparison point.
- PRs #93 and #94 contain follow-up compatibility / startup-validation changes; review against this branch before selective porting.

These sources are references, not merge candidates. No stale branch is merged wholesale.

## Required implementation and verification gates

- [x] Port explicit Google identity linking into current auth and database modules with minimal diffs.
- [x] Add focused tests for successful linking, changed session, and refusal to auto-link a legacy account by email alone.\n- [ ] Add direct database tests for mismatched email and duplicate provider identity; route-level tests for expired/revoked sessions.
- [ ] Remove Manus OAuth runtime dependency without breaking existing session validation or legacy-account recovery.
- [ ] Verify startup validation is scoped correctly: production-only checks must not break protected Preview.
- [ ] Review environment variable names and required/optional provider configuration; do not invent values.
- [ ] Validate schema compatibility and migrations against an isolated staging database restore.
- [ ] Verify storage migration with byte-level checks and preserve encryption-key continuity.
- [ ] Run lint, formatting, typecheck, unit/integration tests, production build, migration validation, Gitleaks, CodeQL, and dependency review where available. Current PR checks: Gitleaks passed; CI and CodeQL still running; dependency review skipped because GitHub Dependency Graph is unavailable.
- [ ] Complete authenticated staging journeys for Google sign-in, email sign-in, existing-account linking, tenant isolation, and session revocation.
- [ ] Obtain separate explicit approval before any production environment change, migration, merge, or deployment.

## Current blockers

- Production environment has no configured variables in the connected Vercel project.
- A verified production database URL and restorable backup are not yet established here.
- The original production JWT/encryption secret and its continuity plan are not established.
- Google OAuth production credentials and callback registration must be configured by the owner in the provider/Vercel dashboards.
- Preview secrets are not production credentials and must not be copied across environments.

## Safety boundary

This PR is an integration workspace only. It does not authorize production writes, secret rotation, data migration, deployment, domain changes, or merging to `main`.
