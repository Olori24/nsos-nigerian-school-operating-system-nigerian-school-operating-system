# NSOS Isolated Staging Provisioning Handoff

**Prepared:** 26 August 2026  
**Status:** An empty managed project named **NSOS Staging** has been created. It has no configured website, custom domain, connector, source, schedule, deployment, copied live record, or provider integration. A separately labelled external Aiven service now exists and its URI is retained only in a staging-namespaced secure variable; no application environment, staging runtime, storage namespace, dataset, provider connection, DNS record, database operation, or load workload has been created.

> **Purpose.** This handoff defines the minimum evidence required to provision a disposable NSOS staging environment for synthetic recovery and progressive-load validation. It does not authorise any deployment, test execution, external provider call, payment action, DNS change, or use of live institutional data.

> **Current boundary.** The empty project is a management-plane container, not yet a testable application environment. It cannot be used for recovery or load evidence until its application, data, storage, secret, provider-stub, and test-identity isolation are separately reviewed.

## 26 August readiness-plan review

The separate **NSOS Staging Readiness and Environment Plan** task completed a bounded design record only. It confirmed that the staging URL is unassigned; no deployment identity, database, storage namespace, provider stub, test account, recovery authority assignment, recovery test, or load test has been created. The record names `NSOS_STG_RELEASE_OWNER` as the role that must be assigned before deployment and requires a segregated, redacted evidence location.

This is useful planning evidence, but it is not an isolation pass and does not satisfy any provisioning, recovery, capacity, delivery, or launch-readiness gate. The six owner/operator inputs at the end of this handoff remain required before a new provisioning approval can be considered.

## Boundary halt and task-local teardown

After the non-secret `NSOS_STAGING_ENV=staging` marker was saved, the staging isolation guard detected that the available managed database boundary could not be independently distinguished from the production marker. It halted before any database connection, query, migration, storage inspection, provider configuration, account creation, recovery, or load action.

The owner then authorised a task-local teardown. Independent review confirms that the staging-local process, listener, socket, source, build, cache, local configuration, provider-stub, and generated role-label artifacts were removed. The rejected database target was not inspected, connected to, queried, migrated, or deleted. The only retained task-local materials are redacted halt and teardown-verification records under the staging project’s evidence area; their planned retention is 30 days pending a separately authorised evidence purge.

> **Current status:** staging remains blocked. No new staging provision or test may proceed until a separately verifiable non-production database boundary is available. The boundary control must not be bypassed, weakened, or suppressed.

## Separate staging database reference — presence verified only

Following owner-approved secure transfer, the isolated **NSOS Staging** project confirms only that a non-empty `NSOS_STAGING_DATABASE_URL` secret is present. The associated non-secret provider identity is Aiven project `nsos-staging-db`, service `nsos-staging-mysql`. The connection value itself was not retained in this repository, documentation, chat, logs, or source code.

No test has interpreted, parsed, connected to, queried, migrated, deployed against, seeded, or otherwise used that secret. Consequently, the provider/service label is not yet independent proof of the URI target, account grants, network route, replication/restore lineage, empty state, or isolation from every production resource. All of those remain required before the staging runtime can be created.

> **Current authorization boundary:** the secure secret may remain stored in NSOS Staging, but no database or provider operation may start until a separate boundary-verification decision is approved. Live NSOS remains completely out of scope.

## Final dedicated-user grant verification — halted

The owner approved creation of `nsos_staging` and `nsos_staging_runtime`, followed by two tightly bounded TLS-required administrative sessions. The first database-scoped grant did not prove removal of inherited privilege. The final session then completed a full privilege/grant-option revoke, a requested `nsos_staging.*` grant, and a privilege flush. Its sanitized `SHOW GRANTS` assessment reported a usage-only global entry and no detected privilege-bearing global grant, but it still could not prove that the remaining privilege-bearing entry was confined to `nsos_staging.*`; an other-schema indicator remained.

No application connection, table inspection, data access, migration, seed, deployment, storage action, provider action, domain action, or live-resource access followed. The URI, hostname, password, raw grant statements, and raw grant results were not retained here.

> **Current staging database verdict:** the Aiven service, the broad staging reference, and `nsos_staging_runtime` are **not approved for runtime, catalog, recovery, or load use**. A provider-supported restricted-principal proof or owner-authorized disposal of this service is required before staging can resume.

## Owner-authorized Aiven service disposal

The owner selected disposal rather than further provider-side privilege troubleshooting. The Aiven console confirmed termination of the isolated `nsos-staging-mysql` service; the staging project’s service list subsequently showed only the provider’s “Create new service” choices and no active service. The service had no application runtime, production connection, imported data, provider integration, deployment, migration, synthetic fixture, recovery rehearsal, or load activity.

The staging-namespaced database reference must now be removed from the NSOS Staging secret interface without reading or reproducing its value. Until a future provider can supply independently verifiable non-production identity and least-privilege evidence, staging recovery, staged load, capacity, and existing-schema upgrade validation remain blocked.

## Scope and non-negotiable boundary

The live NSOS application, database, storage, provider credentials, schools, users, learners, guardians, finance records, and custom-domain routing are out of scope. Staging must be a separately identified application deployment with a separate database, storage namespace, secret set, and test identities. A clone or export of production school data is prohibited; all records must be synthetic and visibly marked as such.

| Boundary | Required staging state | Explicitly prohibited |
|---|---|---|
| Application | Separate deployment identity such as `nsos-staging` | Reusing the production deployment or its environment variables |
| Data | Empty database followed by reproducible synthetic fixtures | Production exports, copied learner/family/finance records, or unidentified fixtures |
| Storage | Separate bucket/prefix and access policy | Production object namespace or shared signed URLs |
| Providers | In-process stubs, sandbox accounts, or deny-by-default adapters | Live Resend, SMS, payment, AI, DNS, or notification submissions |
| Identity | Named test-only owner/admin/teacher/guardian/student accounts | Real staff, student, guardian, or family identity use |
| Domain | Internal deployment URL by default | Changes to `nsos.top`, `www.nsos.top`, or production routing |

## Minimum architecture evidence

Before provisioning, the owner or infrastructure operator must supply the following evidence in a reviewable form. Values may be provided through secure project settings where appropriate; credentials must never be pasted into tickets, chat, logs, or source control.

| Evidence | Required proof | Owner or operator decision |
|---|---|---|
| Separate application environment | Environment/project identifier and non-production deployment URL | Confirm this cannot route to the live NSOS service |
| Separate database | Staging database identifier and verified separation from production | Confirm empty starting state and destructive-test reset authority |
| Separate storage | Namespace/prefix and policy review | Confirm no production object path can be read or written |
| Provider simulation | Stub/sandbox plan for email, SMS, payment, storage, and AI | Confirm no live provider credential is present |
| Test identities | List of non-personal test identities by role | Confirm each identity is synthetic and disposable |
| Abort authority | Named operator and emergency stop/rollback contact | Confirm authority to stop, reset, and restore staging |
| Observability retention | Safe destination for request IDs, latency, error, resource, and database evidence | Confirm retention access and no raw personal data logging |

## Controlled build sequence

Provisioning must proceed one gate at a time. A failed gate stops the sequence; it must not be bypassed by changing the production target, reducing monitoring, or substituting live providers.

| Gate | Permitted activity | Pass evidence | Stop condition |
|---|---|---|---|
| 0 — isolation review | Review identifiers, configuration boundaries, and provider stubs | Separate app, database, storage, secrets, and access controls documented | Any production endpoint, secret, database, or storage namespace appears reachable |
| 1 — synthetic fixture review | Review proposed generator and inventory; do not load it yet | Reproducible generator, explicit synthetic labels, and zero production-source evidence | Any fixture resembles or derives from a real individual or school record |
| 2 — controlled provisioning | Create the approved environment and test accounts | Owner-approved staging readiness record and reset procedure | A provider can send, charge, publish, or mutate an external production service |
| 3 — fail-closed smoke probe | Run the existing read-only probe against the approved staging URL only | `NSOS_LOAD_TEST_APPROVED=true`, HTTPS staging hostname, bounded request/concurrency values, and captured request IDs | Target validation fails, any non-staging URL appears, or unexpected 5xx responses occur |
| 4 — staged workloads | Run separately approved synthetic workloads | Dated latency, error, resource, database, provider-stub, and recovery evidence | Isolation, authorization, resource, or provider-simulation failure |

## Required synthetic data contract

The fixture generator may create fictional institution names, role accounts, admissions, enrolments, financial read models, documents, and provider responses only after Gate 1 approval. It must use deterministic synthetic identifiers, a documented seed, resettable tenant boundaries, and visible `STAGING` labels. It must never fabricate customer testimonials, reviews, payments, achievements, accreditations, credentials, or outcomes for public display.

The initial workload mix must include protected tenant reads, authorization-denied checks, dashboard reads, admissions validation/rejection, staff/teacher reads, guardian/student portal reads, public website reads, private-file denial, bounded import validation, provider-timeout simulation, and idempotent/resettable synthetic mutations. It must not submit a real email, SMS, payment, DNS request, public publication, certificate, or external provider action.

## Recovery and load evidence requirements

A staging recovery rehearsal is not complete merely because a database backup exists. The operator must record the source snapshot type, reset/restore steps, start/end timestamps, result, data-integrity checks, and any corrective action. The capacity verdict remains **UNKNOWN** until a dated report covers concurrency, request volume, p50/p95/p99 latency, 4xx/5xx mix, runtime/database resource use, provider-stub behavior, storage behavior, and recovery observations.

The existing `scripts/measure-health-load.mjs` probe remains deliberately constrained: it requires `NSOS_LOAD_TEST_APPROVED=true`, a provided HTTPS staging/test/sandbox URL, and bounded request/concurrency settings; it rejects the live NSOS host and makes read-only health requests. It is a gate-3 smoke probe, not a 50K benchmark.

## Owner input request

To proceed from preparation to provisioning, provide or approve the following items in the project’s secure channels:

1. The proposed separate staging project/deployment identifier and URL.
2. Confirmation of a separate empty database and storage namespace.
3. The provider-stub or sandbox strategy for email, SMS, payments, storage, and AI.
4. Names or labels for disposable test-only role identities; do not provide personal user data.
5. The authorised abort/recovery operator and the intended evidence-retention location.
6. Explicit approval to create the isolated environment after the above evidence is reviewed.

Until all six inputs are complete, NSOS must remain at preparation status. No capacity, restore, delivery, or launch-readiness claim may be derived from this document.

## Verified stale-secret cleanup

Following owner-authorized disposal of the unusable Aiven service, the NSOS Staging project’s **Application secrets** panel was opened in the owner’s authenticated workspace. It displayed an empty list and only the “Add Secret” action; `NSOS_STAGING_DATABASE_URL` was absent. No value was opened, copied, or retained. The deleted provider service and absent staging reference mean there is no approved staging database connection.

> **Current state:** staging database, runtime, synthetic data, recovery rehearsal, and staged-load activity remain paused. Future work requires a new independently verifiable non-production database route and a separate owner approval.
