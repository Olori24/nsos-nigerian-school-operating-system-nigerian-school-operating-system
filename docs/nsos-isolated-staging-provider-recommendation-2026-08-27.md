# NSOS Isolated Staging Provider Recommendation — 27 August 2026

**Replacement recommendation:** Use **Amazon RDS for MySQL** in a new, staging-only AWS account or a clearly isolated staging boundary as the next path for NSOS. Start with one Single-AZ MySQL DB instance strictly for non-production validation, then delete it and any snapshots after the approved recovery and progressive-load evidence is captured. Do not use the previously disposed Aiven service, any prior staging credential, or the DigitalOcean route that returned an access block.

> This is a replacement recommendation and approval packet only. No AWS account, organization/account boundary, DB instance, database, user, secret, DNS record, storage namespace, provider integration, workload, recovery test, or load test was created by this document.

## Why AWS RDS Is the Current Fit

NSOS needs a managed **MySQL-compatible** staging target that is separately identifiable, can be emptied and disposed, permits a target-only application principal, supports encrypted connection, and has a documented backup/recovery capability for a later rehearsal. Amazon RDS for MySQL supports managed MySQL instances, standard MySQL clients, account management for additional application users, automated backups, snapshots, and point-in-time restore. [1] [2]

The RDS master user is intended for administrative work, including creating additional database accounts, while the application should use a separate least-privilege MySQL user. This enables NSOS to require `SHOW GRANTS` evidence that its runtime identity has only `nsos_staging.*` privileges before any application, recovery, or load work begins. The master account must never be stored in NSOS Staging. [1] [3]

| Candidate | Fit for NSOS isolated staging | Reason for decision |
| --- | --- | --- |
| **Amazon RDS for MySQL — replacement recommendation** | Strong | Managed MySQL, additional application-user support, automated backups, snapshots, point-in-time restore, explicit deletion controls, and no long-term commitment for on-demand testing. Exact region/instance/storage cost must be reviewed at checkout. [1] [2] [4] |
| DigitalOcean Managed MySQL | Unavailable in the current owner browser | The provider displayed an explicit access block during the approved sign-in attempt. NSOS will not retry or bypass that control. |
| Google Cloud SQL MySQL trial | Not recommended for the required recovery proof | The 30-day trial provides a large trial instance but explicitly does not support backup/restore; it also assigns powerful default roles unless the owner further configures custom-role access. That does not meet NSOS’s recovery-evidence and least-privilege needs as cleanly. [8] [9] |
| Previous Aiven service | Rejected / do not reuse | The already documented NSOS staging attempt could not prove a target-only least-privilege boundary and was disposed. Reopening it would violate the containment decision. |

## Required Isolation Design

The following structure must be shown before NSOS connects to any staging database. Names are suggestions only and are not instructions to create resources without approval.

| Layer | Required state | Explicitly prohibited |
| --- | --- | --- |
| Provider account/project | A new staging-only AWS account, or a separately documented isolated AWS staging boundary labelled `nsos-staging`; no production database in the boundary. | Reusing a live NSOS database, the disposed Aiven target, or an ambiguous shared target. |
| Database instance | One new Single-AZ RDS for MySQL instance labelled `nsos-staging-mysql`, in a chosen region, initially empty apart from provider defaults. | Importing/copying production learner, guardian, staff, finance, admission, file, or provider data. |
| Application database | A fresh `nsos_staging` database only. | Connecting the NSOS staging app to `defaultdb` or a database shared with another app. |
| Runtime user | A new `nsos_staging_runtime` identity with the minimum application privileges on `nsos_staging.*` only, verified via `SHOW GRANTS`. | Using `doadmin`, a provider-default admin identity, a user with global privileges, or a user with `GRANT OPTION`. |
| Administrative user | Provider default admin may create/revoke the database user and perform approved backup/recovery administration, but its connection details must never be placed in the staging app. | Storing administrative credentials in NSOS Staging. |
| Connectivity | TLS connection only, restricted to the staging runtime’s documented egress/source pattern where technically feasible. | Plaintext connections, copy/pasting credentials into chat/source/logs, or sharing a production connection string. |
| Storage | A separate staging-only S3/Forge namespace with synthetic files only, if storage testing is in scope. | Production storage buckets/keys or real uploaded documents. |
| Providers | Deny-by-default stubs only. | Resend, Google OAuth, WhatsApp, SMS, payments, analytics, or notification actions against live accounts/recipients. |

## Exact Boundary Verification Before Any NSOS Connection

The provider-side operator must present sanitized evidence of the following sequence. This is a boundary verification, not yet a migration, restore, or load authorization.

1. The staging-only project and newly created database cluster are visibly distinct from live NSOS and are labelled accordingly.
2. The intended `nsos_staging` database exists and has no NSOS tables/data before migration.
3. A separate `nsos_staging_runtime` user exists, with only the application permissions required on `nsos_staging.*`.
4. `SHOW GRANTS FOR 'nsos_staging_runtime'@'%';` is captured and reviewed to confirm there is no `*.*`, unrelated-database, provider-system-schema write, admin, role-admin, or grant-option privilege.
5. A direct connection with `nsos_staging_runtime` confirms the selected database is `nsos_staging`; an attempted unrelated-database operation is denied. Do not include secret values or hostnames in the evidence.
6. A staging-only TLS connection reference is placed through the protected NSOS Staging secret interface only after the above evidence passes. Its value must not be read, copied, printed, or placed in source control.
7. A temporary synthetic-only test plan, recovery authority, abort authority, deletion owner, budget cap, and evidence-retention location are recorded before migration/recovery/load activity begins.

## Cost and Operating Guardrails

Amazon RDS pricing is usage-based and depends on the selected region, instance class, storage, backup storage, and data transfer. AWS recommends using its Pricing Calculator for the current estimate. Newer AWS Free Tier accounts may have credits, but eligibility is account-specific and must not be assumed. [4]

The project should use a fixed stop rule: create no Multi-AZ deployment, replica, migration, backup-retention extension, network add-on, public access exception, or long-lived environment until the owner reviews the current checkout estimate. Before any NSOS application connection, validate that the managed runtime can reach the intended RDS endpoint over TLS without widening access beyond an agreed staging boundary. The environment and any retained snapshots should be deleted after the agreed evidence set is complete unless the owner separately approves retention and budget.

## Approval Required Before Provisioning

The owner must explicitly confirm all of the following in one approval before any provider service is created:

> I approve a new isolated AWS staging boundary and one Single-AZ RDS for MySQL instance for NSOS, limited to a temporary synthetic-data validation purpose. I approve an initial estimated provider spend only after I see the current checkout total. The database must be a fresh `nsos_staging` target with a separate least-privilege `nsos_staging_runtime` user and TLS-only application connection. No production data, live provider action, custom domain, real recipient, or public traffic is permitted. The environment and retained snapshots must be deleted after the approved evidence collection unless I separately approve retention.

After that approval, NSOS must still stop and request a final confirmation before: (a) placing the staging TLS reference into protected secrets; (b) running the first migration; (c) conducting a synthetic restore rehearsal; and (d) initiating any progressive-load run.

## References

[1]: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_MySQL.html "AWS: Amazon RDS for MySQL"
[2]: https://aws.amazon.com/rds/features/backup/ "AWS: Amazon RDS backup and point-in-time restore"
[3]: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.MySQL.CommonDBATasks.privilege-model.html "AWS RDS for MySQL privilege model"
[4]: https://aws.amazon.com/rds/pricing/ "AWS RDS pricing and Free Tier"
[8]: https://docs.cloud.google.com/sql/docs/mysql/free-trial-instance "Google Cloud SQL for MySQL free trial"
[9]: https://docs.cloud.google.com/sql/docs/mysql/users "Google Cloud SQL MySQL user accounts"
