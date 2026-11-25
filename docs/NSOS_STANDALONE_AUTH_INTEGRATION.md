# NSOS Standalone Authentication Integration

Status: Google/email standalone sign-in and account linking implemented; normal sessions resolve locally. Latest CI, CodeQL and secret scan passed. Staging and production cutover remain unverified.

## Baseline

- Integration branch is based on current `main` at `44292d393c565c933ac52281d5d1482afca68250`.
- Current production deployment also points to `44292d393c565c933ac52281d5d1482afca68250`.
- The connected Vercel project has no Production environment variables configured.
- The integration branch now handles ordinary Google/email sessions locally. The legacy OAuth adapter remains isolated for old OAuth callbacks and scheduled-task identity; it is optional at startup and fails closed if invoked without its provider configuration.
- Current main rejects attaching a new provider to a legacy account based on matching email alone. This branch adds explicit, session-bound Google and email identity linking.

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
- [x] Add browser- and session-bound passwordless-email identity linking without changing the existing magic-link table or invalidating current sessions.
- [x] Resolve normal authenticated requests from NSOS database records only; missing local accounts now fail closed instead of being imported from the Manus OAuth service.
- [x] Add focused tests for successful linking, changed session, and refusal to auto-link a legacy account by email alone.\n- [ ] Add direct database tests for mismatched email and duplicate provider identity; route-level tests for expired/revoked sessions.
- [x] Remove the legacy OAuth service from ordinary request authentication and make its production startup requirement optional.\n- [ ] Decide whether to retire the legacy OAuth callback and scheduled-task adapter after confirming no active client or automation depends on it.
- [ ] Verify startup validation is scoped correctly: production-only checks must not break protected Preview.
- [x] Make `JWT_SECRET` and `DATABASE_URL` the core production requirements; legacy `OAUTH_SERVER_URL` and `VITE_APP_ID` are no longer required for Google/email authentication.\n- [ ] Verify Google and Resend configuration in an isolated staging environment; do not invent values.
- [ ] Validate schema compatibility and migrations against an isolated staging database restore.
- [ ] Verify storage migration with byte-level checks and preserve encryption-key continuity.
- [x] Run lint, formatting, typecheck, unit/integration tests, production build, migration validation, Gitleaks, and CodeQL. Latest head passed all available checks; Dependency Review was skipped because GitHub Dependency Graph is unavailable.
- [ ] Complete authenticated staging journeys for Google sign-in, email sign-in, existing-account linking, tenant isolation, and session revocation.
- [ ] Obtain separate explicit approval before any production environment change, migration, merge, or deployment.

## Current blockers

- Production environment has no configured variables in the connected Vercel project.
- A verified production database URL and restorable backup are not yet established here.
- The original production JWT/encryption secret and its continuity plan are not established. Do not rotate it; existing session tokens and encrypted records may depend on it.
- Google OAuth production credentials and callback registration must be configured by the owner in the provider/Vercel dashboards.
- Preview secrets are not production credentials and must not be copied across environments.

## Safety boundary

This PR is an integration workspace only. It does not authorize production writes, secret rotation, data migration, deployment, domain changes, or merging to `main`.
