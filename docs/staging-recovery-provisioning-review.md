# NSOS Staging and Recovery Provisioning Review Packet

**Status:** Owner-approved review and preparation only. No application, database, storage namespace, secret, provider account, workload, recovery rehearsal, or capacity test was created by this packet.

## Proposed isolated boundary

| Boundary | Required review position | Current status |
|---|---|---|
| Application | Separately identifiable staging hostname; production host rejected by the load probe | Not provisioned |
| Database | Separately named empty database with a dedicated least-privilege runtime principal limited to the staging schema | Not provisioned; prior provider path remains paused |
| Storage | Separate object-storage namespace and keys with no production objects or references | Not provisioned |
| Secrets | Staging-only secret set; live Resend, payment, SMS, domain, and production credentials absent | Not configured |
| Providers | Deny-by-default deterministic adapters for email, SMS, payments, storage, and AI | Required before any workload |
| Data | Reproducible synthetic schools, users, memberships, learners, guardians, invoices, documents, and messages only | Not generated |
| Roles | Disposable synthetic labels with owner, admin, staff, tutor, parent, and student cases | Not created |
| Recovery | Disposable restore target, migration state, rollback path, RPO/RTO worksheet, and redacted evidence location | Not rehearsed |
| Abort authority | Named operator, stop conditions, kill/rollback steps, and evidence retention owner | Must be named before execution |

## Least-privilege review

The staging runtime principal must not be reused from any broad or production reference. Before connection, the owner must review the principal identity, effective grants, database/schema scope, network constraint, secret reference, and deletion boundary. A failed scoped-grant check is a blocker; it must not be treated as proof of isolation.

## Review-only sequence

The safe preparation sequence is to confirm the staging hostname, empty database identity, storage namespace, provider-stub behavior, synthetic-data generator, disposable roles, abort authority, and redacted evidence location. Only after all evidence is independently visible should a separate provisioning confirmation be requested. Provisioning itself, migration execution, recovery rehearsal, progressive load, and any capacity claim remain separate actions.

## Final confirmation required before action

A final confirmation must identify the exact project or provider, database and storage boundary, region or location if applicable, deletion/snapshot behavior, cost exposure, runtime principal, secret insertion path, network constraint, named abort authority, and evidence destination. Approval of this review packet alone does not authorize billing, provisioning, credentials, workload execution, recovery, or load.

## Current decision

**Review prepared; provisioning remains blocked.** The safest next step is an independently verifiable non-production route with no production credentials or records. Until that route is available and separately confirmed, NSOS must keep recovery and load work paused.
