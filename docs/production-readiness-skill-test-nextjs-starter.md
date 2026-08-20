# Production Readiness Audit Skill Test — Independent Repository

**Test date:** 20 August 2026  
**Skill under test:** `production-readiness-audit`  
**Target:** [`vercel/nextjs-postgres-auth-starter`](https://github.com/vercel/nextjs-postgres-auth-starter), a public Next.js, NextAuth, Drizzle, and PostgreSQL starter repository.

## Scope and safety boundary

The target was selected as an independent public web-application repository. The assessment used repository metadata, a read-only shallow clone, static source inspection, and a single read-only request to the public demo URL documented by the project. No dependencies were installed, no project code was executed, no account was created, no login was attempted, and no database or mutation traffic was sent.

## Evidence produced by the skill

| Audit activity | Result | Evidence status |
| --- | --- | --- |
| Target selection | Public repository confirmed; default branch `main`; updated 15 August 2026. | **Measured** |
| Stack baseline | Next.js 14.0.4, NextAuth 5.0.0-beta.4, Drizzle ORM 0.29.2, `postgres` 3.4.3, and bcrypt-ts 5.0.0 in `package.json`. | **Inspected** |
| Authentication review | Credentials provider loads one user by email and compares bcrypt hashes before returning a user. | **Inspected** |
| Database review | A module-level PostgreSQL client is created with TLS required. The starter checks and creates its user table at runtime. | **Inspected** |
| Demo availability | The README-linked `https://nextjs-postgres-auth.vercel.app/` returned Vercel `404 DEPLOYMENT_NOT_FOUND`. | **Measured** |
| Dependency advisories | **Unknown.** The lockfile-only audit was cancelled because the target requested a package-manager download; the test did not alter the environment. | **Unknown** |
| Live journey, headers, latency, capacity | **Unknown.** No working demo or authorised staging environment was available. | **Unknown** |

## Outcome

The skill correctly prevented a fabricated readiness conclusion. It distinguished the source-inspected security and architecture observations from missing live-service evidence, and it stopped short of running untrusted code or generating test records.

The target receives no launch-readiness verdict because it is a starter repository with an unavailable public demo. A production verdict would require an authorised deployment, its intended environment configuration, safe test identities, and service telemetry.

## Skill improvement made after the test

The skill now explicitly instructs the auditor to stop at source and metadata evidence when a repository-linked demo is unavailable, rather than guessing an alternative endpoint or deploying a third-party repository.
