# Isolated NSOS Registration Harness

## Purpose

The registration harness is a local, non-production test boundary for the NSOS passwordless registration and welcome-email workflow. It lets maintainers exercise the HTTP callbacks without signing into the dashboard, using a school tenant, reading production records, or sending a live message through Resend.

## Execution

Run the dedicated command from the repository root:

```bash
pnpm test:harness:registration
```

The command runs only `server/welcome-registration-harness.test.ts` under Vitest. The test creates an ephemeral Express server bound to `127.0.0.1` on an operating-system-selected port, sends requests to that server, and closes it in a `finally` block after each scenario. It does not start the NSOS application server, run migrations, create a database, or persist test records.

## Provider and data isolation

The harness replaces the welcome-dispatch boundary with a deterministic in-memory provider stub. The stub returns either an accepted result or a failure result, so the registration route can be verified without a network request. Database calls used by the route are replaced with scoped Vitest spies and synthetic identifiers. Test addresses use the reserved `.test` domain and do not represent real families, schools, or users.

The verification callback is still exercised through its real local HTTP route. Its database token-consumption boundary is stubbed to return a safe `https://nsos.top` origin for the success case and an error for the replay case. The test verifies the redirect and rejection behavior without creating a session or sending email.

> The harness is a test file, not a public route. There is no production endpoint, feature flag, scheduled job, worker, or background process associated with it.

## Cleanup and abort rules

Each test resets spies and global stubs after completion. The local HTTP server is always closed, including after assertion failures. The harness must not be pointed at a live database or provider. If a future change requires a real provider check, it must be implemented as a separately named, explicitly opt-in operational test with an owner-approved recipient and a fixed non-customer payload; it must not be added to this harness.

Do not add the harness file to production bundles or call it from `server/_core/index.ts`. Do not replace `.test` addresses with real addresses, add learner or parent data, or remove the deterministic provider stub. Any database-backed staging rehearsal remains a separate activity requiring a disposable database and the established staging authorization boundary.

## Covered behaviors

| Scenario | Boundary exercised | Expected result |
|---|---|---|
| New passwordless registration | Local HTTP callback plus deterministic welcome-dispatch stub | Account flow redirects successfully and dispatch receives the safe identity/origin payload |
| Welcome provider failure | Local HTTP callback plus failing deterministic stub | Account registration still redirects successfully; email failure does not block sign-in |
| Email verification success | Real local verification callback plus token-consumption stub | Redirects to the stored safe origin with `email_verified=1` |
| Email verification replay | Real local verification callback plus rejected token-consumption stub | Returns a client error and does not redirect |

The full project command remains `pnpm test`; the dedicated command is intended for fast, repeatable registration-flow validation during development and CI troubleshooting.
