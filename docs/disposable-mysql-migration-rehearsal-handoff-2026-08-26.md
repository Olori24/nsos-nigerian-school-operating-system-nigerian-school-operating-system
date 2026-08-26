# Disposable MySQL 8.4 Migration-Rehearsal Handoff

**Status:** Closed. The owner-authorized disposable database/runtime teardown and scratch-project deletion are complete. The rehearsal evidence boundary remains provider- and data-safe; artifact attachment could not be independently verified in the shared view.

**Scratch-project evidence, 26 August 2026:** The owner-approved `NSOS Migration Scratch` project exists at `https://manus.im/app/project/7RT4caaY8dQmJ7jCfXWRuW`. Its project view shows no configured instructions, connectors, files/sources, website, scheduled task, or project task. This confirms the intended empty resource boundary only; it does not create a database, authorize a migration, or prove teardown.

**Artifact-provenance evidence, 26 August 2026:** The completed isolated staging repair task identifies its source baseline as `Olori24/nsos-nigerian-school-operating-system-nigerian-school-operating-system` at commit `ccbfd6317332a4f14be05b74667390e1e33ab6b5` and provides a task artifact named `nsos-staging-source-repair.patch` alongside validation logs. The task interface does not expose an absolute filesystem path or a direct public artifact URL. Therefore, the scratch rehearsal may use the repair only after the **task artifact itself** is attached to the scratch project; it must not substitute `/home/ubuntu/nsos`, an inferred sandbox path, or any live/staging project path.

**Scratch attachment verification, 26 August 2026:** The scratch project reloaded successfully and retains no instructions, connectors, website, scheduled task, or project task. The shared project view does not render an attachment list, so the `nsos-staging-source-repair.patch` attachment cannot yet be independently verified in this context. No database preflight, migration task, or connection was started as a result.

**Scratch task observation, 26 August 2026:** A task named `Setup and Teardown of Disposable MySQL 8.4 for NSOS Migration` now exists inside NSOS Migration Scratch. Its visible prompt contains the owner-approved disposable-database, preflight, sanitized-evidence, and teardown boundary, and the task labels the work as no-credit. Its initial response is still at the planning stage; no database connection, migration execution, provider, domain, deployment, schedule, or workload action is evidenced by the observed task content.

**Authenticated management view, 26 August 2026:** The signed-in scratch project page remains accessible and continues to show no configured instructions, connectors, website, or scheduled task. Its task list includes the disposable migration task, but the project attachment list is not rendered in the shared view, so the repair-patch presence remains unverified. No database preflight or project deletion action was initiated from this view.

**Teardown confirmation, 26 August 2026:** The authorized rehearsal task reported that its disposable database and local rehearsal runtime were destroyed and that teardown evidence was captured. The owner then used the project-management confirmation for `NSOS Migration Scratch` and reported deletion complete. A subsequent authenticated request for `https://manus.im/app/project/7RT4caaY8dQmJ7jCfXWRuW` redirected to the general workspace, where `NSOS Migration Scratch` no longer appeared in the project navigation. The linked task record remains visible outside the deleted project, as the project-management warning stated; no live NSOS or NSOS Staging resource was removed or changed.

Because the shared task view never independently verified the patch attachment or exposed the disposable database’s preflight/migration log contents, this record does **not** assert a full migration-chain pass. It records the safe teardown boundary only: no database, runtime, or scratch project remains available for further work.

## Purpose and boundary

The isolated NSOS Staging source repair passed TypeScript, build, and its staging test suite after correcting MySQL 8.4 compatibility statements in migrations `0002`, `0005`, and `0007`. The remaining evidence gap is execution of the complete migration chain on a **disposable MySQL 8.4 database**. This rehearsal is not a staging release, recovery test, provider test, load test, or production deployment.

The target must be an empty, short-lived database created solely for this rehearsal. It must not share a database, schema, account, storage namespace, or credentials with live NSOS, the managed production project, an existing staging schema, or any tenant record.

## Required owner and infrastructure evidence

| Requirement | Minimum acceptable evidence | Explicitly prohibited |
|---|---|---|
| Disposable target | A database name and endpoint labelled as disposable staging, with a MySQL 8.4 version check | Production or existing staging database URL; shared tenant schema |
| Access control | A non-production migration account limited to the disposable database | Production database credentials or broadly privileged shared accounts |
| Empty-target proof | Preflight confirms no NSOS operational tables, tenant records, or partial migration journal unless the run is explicitly a documented partial-schema preflight | Reusing an unknown schema or inferring emptiness from its name |
| Artifact provenance | The exact staging source repair patch and migration list are recorded | Pulling unreviewed code or altering live source during the rehearsal |
| Evidence retention | Sanitized command exit status, version, migration IDs, schema checks, and teardown confirmation | Storing connection strings, raw data, credentials, or query results |
| Teardown authority | Named role permitted to drop the disposable database after evidence collection | Keeping a reusable schema with fixture or tenant data |

## Mandatory preflight

Before any migration command, the authorised operator must confirm the following in the disposable environment. The preflight record must contain only safe identifiers and pass/fail outcomes.

1. The server reports MySQL `8.4.x`.
2. The target database label contains a disposable staging designation and is not an NSOS production or existing staging identifier.
3. The migration account resolves only to that target database.
4. The migration journal and expected schema columns are absent for a fresh run, or their exact state is captured for an explicitly authorised partial-schema preflight.
5. No operational records, tenant tables with data, uploaded objects, provider credentials, or live environment variables are present.
6. The operator has a documented teardown action: drop the disposable database after evidence is collected.

## Authorised rehearsal sequence

| Step | Permitted activity | Required evidence | Stop condition |
|---|---|---|---|
| 1 | Record preflight outcomes | MySQL version, target label, fresh/partial status | Target is not demonstrably disposable or isolated |
| 2 | Apply the repaired migration chain in order | Migration IDs and command exit status only | Any migration error, unexpected journal state, or schema mismatch |
| 3 | Run post-migration schema checks | Expected table/column/index presence without row data | Any missing or incompatible schema artifact |
| 4 | Run bounded staging application validation | TypeScript, tests, and build only; no provider or workload use | Configuration requests a live secret, provider, domain, or deployment |
| 5 | Package sanitized evidence and drop the database | Teardown confirmation and retained artifact list | Teardown is not authorised or cannot be confirmed |

## Explicit exclusions

This rehearsal must not copy tenant records, learner records, guardian data, finance data, uploaded files, API keys, OAuth credentials, sender configuration, provider settings, domains, schedules, or any live secret. It must not send messages, perform payments, publish a site, start a server, or execute a load workload.

## Final approval required

Before step 1, the owner must separately confirm the exact disposable target label, the non-production operator role, the fact that the target is not an existing schema, and the teardown authority. Approval for staging source repair does not authorise a database connection or migration execution.

## Uploaded repair-artifact provenance review

On 26 August 2026, the owner uploaded `nsos-staging-source-repair.patch` directly to the NSOS project workspace. The attached file is **4,305 bytes** and has SHA-256 checksum `08b1e47fd013ca28d065a5b6d71f2a6005d0890b0f06a449e8bd6cc7de3ec5b4`.

| Review dimension | Evidence | Result |
|---|---|---|
| Format | Textual Git diff containing ANSI colour escape sequences | **Not directly applicable.** It must be canonicalized and reviewed in a new disposable workspace before any `git apply`-style operation; it was not applied here. |
| Migration scope | Six `ADD COLUMN IF NOT EXISTS` removals in `0002_little_shatterstar.sql`, plus one each in `0005_nebulous_warstar.sql` and `0007_workable_xavin.sql` | **Matches** the recorded eight-statement MySQL 8.4 compatibility repair. |
| Provider-test scope | Makes the live sender-authorization test opt-in only when both `RESEND_API_KEY` and `AUTH_EMAIL_FROM` are present | **Matches** the recorded provider-dependent test gating; no live provider check was invoked. |
| Staging test fixtures | Adds explicitly labelled placeholder values, including an `.invalid` sender address and provider URL | **Consistent with** non-secret staging fixtures. No supplied value was used as a credential. |
| Current main-source comparison | Current NSOS source still contains all eight `IF NOT EXISTS` statements, an unconditional sender-authorization test, and no listed staging placeholders | **Confirms the artifact has not been applied** to live source. |

The review verifies **only attachment identity and declared source scope**. It does not establish a full-chain migration pass, a valid disposable target, application compatibility, recovery readiness, provider behavior, or load capacity. Removing `IF NOT EXISTS` makes the relevant `ADD COLUMN` operations dependent on the mandatory fresh/partial-schema journal-and-column preflight; no database, runtime, source application, provider, or deployment action was taken during this review.

## Owner-approved fresh rehearsal boundary

After reviewing the artifact checksum and scope, the owner explicitly approved a **fresh, empty, disposable MySQL 8.4 rehearsal**. This approval covers only an isolated target created solely for the reviewed artifact, its required preflight, sanitized full-chain and schema evidence, and final destruction. It does not permit reuse of live NSOS, NSOS Staging, the deleted prior scratch project, any existing schema, storage namespace, provider, domain, payment, or learner/tenant data.

At the start of this approved phase, no new disposable database name, endpoint, connection string, migration account, runtime, or project had been created or selected. The authenticated workspace was opened only to locate a separate-resource creation path; its visible existing projects/tasks were not used or modified.

## Fresh rehearsal project and target-provisioning status

The owner then created a separate project, **NSOS Migration Rehearsal 2026-08-26**, at `https://manus.im/app/project/XJLa7rvmmyCv73rQXSjE2D`. A read-only authenticated inspection confirmed that it was newly created and had no project instructions, connectors, files/sources, website, scheduled tasks, source import, or existing task records. This establishes a separate project boundary only; it does not itself create a MySQL database or account.

The owner-created task **How to Set Up a Disposable MySQL 8.4 Database** is associated with that project. Its initial environment check found no Docker installation, no running MySQL/MariaDB server, and only a local MySQL 8.0 client; that result was correctly rejected as insufficient. The completed task subsequently reported—and its recorded query output shows—the following isolated preflight:

| Required check | Recorded result |
| --- | --- |
| Target label | `DISPOSABLE-MYSQL84-20260826` |
| Server version | `SELECT VERSION()` returned `8.4.6` |
| Transport | Dedicated Unix socket with `skip_networking` set to `ON` |
| Database | Fresh `dsp_m84_20260826` schema with 0 user tables and 0 user columns |
| Restricted account | `dsp_m84_runner_20260826@localhost`, granted `ALL PRIVILEGES` only on `dsp_m84_20260826`.* |
| Journal/expected-column preflight | No matching migration-journal tables and no user columns present |
| Recorded teardown | `/home/ubuntu/.disposable-mysql84-20260826/teardown.sh` in the separate rehearsal sandbox |

No source patch had been applied and no migration had been run when that evidence was captured. The target is eligible only for the next reviewed-artifact canonicalization and migration-preflight instruction. A full-chain migration pass, application compatibility, recovery validation, provider behavior, and load/capacity evidence are still not established.

## Canonical patch review on the disposable target

The owner-approved rehearsal task preserved the uploaded artifact and re-verified its original SHA-256 as `08b1e47fd013ca28d065a5b6d71f2a6005d0890b0f06a449e8bd6cc7de3ec5b4`. It produced a separate ANSI-stripped canonical copy with SHA-256 `667d8553a8e12b2fa47f5232158f3de7cf1f38d238f900c57e2e0ffcadf3e8eb`; the original was not altered. `git apply --check` passed and `git diff --check` produced no whitespace issue in the temporary source workspace. The patch changed only `drizzle/0002_little_shatterstar.sql`, `drizzle/0005_nebulous_warstar.sql`, `drizzle/0007_workable_xavin.sql`, `server/email-sender-authorization.integration.test.ts`, and `vitest.config.ts`; no shell path, executable-mode change, or live credential was reported.

The originally requested commit `55bd8333423a239acd9b5a53dba28d1250728fa2` was not retrievable from the public GitHub repository (`upload-pack: not our ref` and public commit URL 404). The rehearsal therefore selected the latest publicly retrievable compatible commit `ccbfd6317332a4f14be05b74667390e1e33ab6b5` after checking its history; the canonical patch applied there in the temporary rehearsal workspace only. This is **compatibility evidence for that public revision**, not proof that the unretrievable requested revision or NSOS Staging itself is migration-validated.

No migration has run after this patch review. The target remains fresh with zero user tables, zero user columns, and no Drizzle migration journal. Before execution, the migration command must be shown to use only the target task’s socket-only restricted account; it must not infer that an arbitrary `DATABASE_URL` URI can carry a mysql2 `socketPath` without a verified runner configuration.

### Runner-configuration constraint

The compatible source revision exposes its Drizzle configuration through a single `DATABASE_URL` string. A read-only inspection of the installed Drizzle Kit package did not reveal a MySQL `socketPath` configuration field, so the existing project configuration cannot be represented as a verified direct Unix-socket migration command. The remaining safe option is a task-local loopback bridge from a short-lived `127.0.0.1` port to the existing Unix socket, plus a separate disposable MySQL account restricted solely to `dsp_m84_20260826` from `127.0.0.1`. The target task must prove the bridge binds only to loopback, MySQL networking remains disabled, the runner account has grants only on that fresh schema, and its `DATABASE_URL` uses only the loopback bridge. This changes no production or staging resource; it remains a prerequisite, not a migration result.

### Loopback preflight evidence

The rehearsal task created a temporary bridge at `127.0.0.1:60575` to its task-local Unix socket, with the listener observed only on `127.0.0.1` and MySQL reporting `skip_networking=1`. A restricted runner account connected through that bridge and reported MySQL `8.4.6`, the expected `dsp_m84_20260826` database, and its disposable runner identity. The read-only preflight again found zero user tables, zero columns, no `__drizzle_migrations` journal, and no other named migration-journal candidate. The bridge was explicitly closed after the query; no listener remained on the chosen port.

The task sandbox then reported `stopped` before any migration instruction was issued. Consequently, the database/runtime state is now **unknown until the task is resumed and repeats its isolated-target, runner-account, bridge, and clean-schema preflight**. The prior evidence remains useful as a boundary check but is not authorization to assume the stopped target is still live, empty, or reachable. No migration ran.

### Resumed-target recheck

The task was resumed and independently rechecked. It reported a running task-local MySQL `8.4.6` server and a fresh loopback bridge at `127.0.0.1:64117`, bound only to loopback and connected only to its task-local Unix socket. The restricted `dsp_m84_runner_20260826@localhost` account again returned the expected disposable database identity, zero user tables, zero user columns, no Drizzle journal, and no other named migration journal candidate; `skip_networking=1` remained set. The bridge was closed after the read-only preflight. This evidence clears only the disposable target for the owner-approved full-chain command; it does not validate production, NSOS Staging, recovery, load, or capacity behavior.

### Full-chain attempt — blocked

The one owner-authorized full-chain command, `pnpm exec drizzle-kit migrate --config drizzle.config.ts`, was executed exactly once against the loopback-only disposable target. It failed at `drizzle/0003_outstanding_adam_destine.sql` on `CREATE INDEX IF NOT EXISTS staffDuty_school_idx ON staffDuties (schoolId)`, with MySQL `ER_PARSE_ERROR` / `1064`. This reveals an additional MySQL-incompatible index statement outside the uploaded patch’s authorized 0002/0005/0007 scope.

The task stopped as instructed: it made no repair, retry, migration generation, `db:push` invocation, source-patch modification, or post-failure migration validation. It also closed the temporary bridge. The disposable schema may now contain changes from migrations prior to 0003, so it must be inspected read-only and then destroyed; it is not a valid retry target. The full migration chain remains **unvalidated**. Any repair of 0003 or other newly discovered statements requires a separate reviewed artifact and approval.

### Post-failure read-only inventory

The required read-only inventory found a partial disposable schema: `__drizzle_migrations` existed with three ordered journal rows, alongside 35 user tables and 359 user columns. The available tables are consistent with migrations having progressed through the earlier chain before the 0003 failure; this is not proof of any later migration. MySQL remained socket-only (`skip_networking=1`), the temporary bridge state file and listener were absent, and the task-local target process was still running. No repair, retry, source edit, database mutation, or migration command occurred during that inspection. This partial target is now ready only for approved destruction.

### Partial-target teardown

The task-local disposable MySQL target and its temporary patched source workspace were destroyed under the original approved rehearsal scope. The task reported and verified absence of the target root, data and log directories, Unix socket, PID file, bridge state, runner and administrator credentials, temporary patch copies, source workspace, task-specific helper files, target MySQL process, target `socat` process, and target Unix-socket listener. No live NSOS, NSOS Staging, shared project, domain, provider, storage, repository, or learner record was accessed or modified.

> **Current factual verdict:** the isolated MySQL 8.4 full-chain migration rehearsal was attempted once and failed safely at migration 0003. It is not validated. A fresh disposable target, a newly reviewed source repair that covers 0003 and any other newly discovered incompatibilities, a repeat preflight, and a new owner approval are required before another full-chain attempt.

### Source-only repair review — 26 August 2026

With separate owner approval, a detached local worktree was created from NSOS checkpoint `90e93eaf06c8d01441871737dbab50880e3b680f`. A read-only scan found no remaining conditional `CREATE INDEX` or `DROP INDEX` statements after the repair. The new unified-diff artifact, `nsos-mysql84-source-repair.patch`, has SHA-256 `4104e083f3262d34de00e310ed74d47f13b772b0cff2b568d2bf2dc6464cb7d1` and changes exactly four migration files:

| Migration | Source-only repair |
| --- | --- |
| `0002_little_shatterstar.sql` | Removes six unsupported conditional `ADD COLUMN` clauses from the already reviewed repair. |
| `0003_outstanding_adam_destine.sql` | Removes the two unsupported conditional `CREATE INDEX` clauses that blocked the first rehearsal. |
| `0005_nebulous_warstar.sql` | Removes one unsupported conditional `ADD COLUMN` clause. |
| `0007_workable_xavin.sql` | Removes one unsupported conditional `ADD COLUMN` clause. |

The artifact reverse-applied cleanly against its isolated worktree changes. With a deliberately unreachable `DATABASE_URL`, isolated `pnpm install --frozen-lockfile --ignore-scripts`, TypeScript, and production build all passed. No database command, migration execution, provider call, secret change, domain action, staging data operation, or publication occurred in this source-only review. This does **not** validate the migration chain; a future fresh disposable target still needs an explicit approval, preflight, and full-chain evidence run.

### Fresh `-r2` full-chain success — pending mandatory teardown

Under the separately approved fresh-rehearsal scope, a new MySQL `8.4.6` target was created with a new label, fresh data directory, socket-only networking, empty schema, absent migration journal, local-only restricted runner account, and a fresh temporary source workspace at compatible public commit `ccbfd6317332a4f14be05b74667390e1e33ab6b5`. The four-file artifact above was checksum-verified, passed `git apply --check`, and was applied only to that temporary workspace.

The approved command `pnpm exec drizzle-kit migrate --config drizzle.config.ts` completed once through a short-lived loopback-only bridge. The resulting `__drizzle_migrations` journal contained 65 rows. A second execution completed as a no-op, with the journal remaining at 65 rows. The disposable schema contained 100 user tables and 1,138 user columns; targeted checks confirmed the repaired outcomes in migrations `0002`, `0003`, `0005`, and `0007`. The bridge was closed after validation.

This is full-chain evidence for a fresh MySQL 8.4 target only. It does not demonstrate safety against an existing partial schema, recovery behaviour, staged-load capacity, provider behaviour, or production readiness. The new target and its temporary source workspace remain intact only until the approved teardown is verified; they must not be reused.

### Fresh `-r2` teardown — verified

The task’s final teardown report was independently reviewed. It confirms the `-r2` MySQL target, MySQL process, target Unix socket, PID file, data/run/log/configuration directories, bridge state, bridge process and listener, restricted runner and local-administration credentials, downloaded patch, temporary source workspace, and target-specific helper artifacts were all absent afterward. No non-disposable resource was accessed, changed, or deleted.

> **Fresh-target migration verdict:** the reviewed four-file artifact executed successfully across the full retained chain on a newly empty MySQL 8.4.6 target, passed a no-op rerun, and the entire target was then removed. This remains fresh-target compatibility evidence only; existing-schema upgrade safety, recovery, staged load, provider behaviour, and production-readiness proof are separate unresolved gates.
