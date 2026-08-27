# NSOS Continuous-Integration Validation Gates

**Status:** Deterministic pull-request and main-branch validation only. This workflow does not configure an external provider, send email, change a domain, connect to staging, or establish recovery or capacity evidence.

## Default CI Contract

The NSOS CI workflow now runs locked dependency installation, a production-dependency audit, linting, formatting verification, TypeScript checking, disposable MySQL migration validation, deterministic tests, and a production build. The workflow uses an ephemeral MySQL 8.4 service with CI-only credentials and does not read or expose a Resend credential.

| Gate | Purpose | Boundary |
|---|---|---|
| Locked install | Detect dependency-lock drift | Uses `pnpm install --frozen-lockfile` only |
| Production dependency audit | Detect known production dependency advisories | Does not replace a formal security review |
| Lint, format, and typecheck | Catch static implementation regressions | No runtime configuration change |
| Migration validation | Check the retained migration chain against disposable MySQL 8.4 | Not evidence for an existing-schema upgrade or recovery restoration |
| Deterministic tests and build | Validate local contracts and a production bundle | Does not prove production capacity or provider behavior |

## External Sender-Health Gate

The Resend sender-domain assertion is deliberately retained, but it runs only when `RUN_LIVE_PROVIDER_TESTS=true` is explicitly supplied in an authorised environment with an existing project credential. Default CI sets that switch to `false` and never supplies `RESEND_API_KEY`. This separation prevents provider availability or a sender-domain incident from masking deterministic source regressions, while preserving the strict `verified`/`partially_verified` sender-health requirement for the approved live check.

The current external result remains `partially_failed` for `nsos.top`; it is recorded as an open provider-support investigation and must not be resolved by weakening the test, changing DNS, creating a mailbox, or sending a real email.

## Local Validation Evidence

The deterministic gate sequence passed locally: formatting check, lint, TypeScript check, all deterministic tests, and production build. Vitest reported **127 passing test files, 462 passing tests, and one skipped live-provider sender-health test**. The production build completed with an existing large-chunk warning; this is a bundle-optimisation signal, not capacity evidence. No live sender-health request, provider configuration change, migration against a non-disposable database, staging action, recovery operation, load probe, or email delivery action occurred during this validation.
