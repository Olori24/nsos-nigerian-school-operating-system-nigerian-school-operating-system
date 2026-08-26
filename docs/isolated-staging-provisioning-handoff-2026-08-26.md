# NSOS Isolated Staging Provisioning Handoff

**Prepared:** 26 August 2026  
**Status:** An empty managed project named **NSOS Staging** has been created. It has no configured website, custom domain, connector, source, schedule, deployment, copied live record, or provider integration. No application environment, separate database/storage namespace, dataset, provider connection, DNS record, or load workload has been created.

> **Purpose.** This handoff defines the minimum evidence required to provision a disposable NSOS staging environment for synthetic recovery and progressive-load validation. It does not authorise any deployment, test execution, external provider call, payment action, DNS change, or use of live institutional data.

> **Current boundary.** The empty project is a management-plane container, not yet a testable application environment. It cannot be used for recovery or load evidence until its application, data, storage, secret, provider-stub, and test-identity isolation are separately reviewed.

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
