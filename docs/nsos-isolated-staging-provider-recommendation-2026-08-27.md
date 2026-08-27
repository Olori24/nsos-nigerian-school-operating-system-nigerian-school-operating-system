# NSOS Isolated Staging Provider Recommendation — 27 August 2026

**Recommendation:** Use **DigitalOcean Managed MySQL** in a newly created, staging-only DigitalOcean team/project as the preferred next staging database path for NSOS. Start with one single-node MySQL cluster strictly for non-production validation, then delete it after the approved recovery and progressive-load evidence is captured. Do not use the previously disposed Aiven service or any prior staging credential.

> This is a recommendation and approval packet only. No DigitalOcean account, team, project, database, user, secret, DNS record, storage namespace, provider integration, workload, recovery test, or load test was created by this document.

## Why This Is the Best Current Fit

NSOS needs a managed **MySQL-compatible** staging target that is separately identifiable, can be emptied and disposed, permits a target-only application principal, supports encrypted connection, and has a documented backup/recovery capability for a later rehearsal. DigitalOcean documents managed MySQL support, end-to-end SSL encryption, metrics, VPC placement, daily point-in-time backups, and automated failover capabilities. Its entry single-node MySQL cluster is explicitly positioned for preliminary development/testing and starts at $15 per month; it is not highly available, which is appropriate for a time-bounded staging evidence exercise rather than production. [1] [2]

Critically, DigitalOcean documents that new MySQL users initially inherit broad `doadmin` access but can be restricted with SQL `REVOKE` and database-specific `GRANT` statements. It also documents `SHOW GRANTS` for later evidence collection. This makes it possible to insist on proof that the NSOS runtime identity has only `nsos_staging.*` privileges before any application, recovery, or load work begins. [3] [4]

| Candidate | Fit for NSOS isolated staging | Reason for decision |
| --- | --- | --- |
| **DigitalOcean Managed MySQL — recommended** | Strong | Managed MySQL, TLS, daily PITR/metrics, documented user creation/restriction/revocation, clear single-node testing starting point, and service/user deletion controls. [1] [2] [3] |
| Amazon RDS for MySQL | Strong but more operational overhead | RDS supports account-management statements and recommends application-specific minimum-privilege users, with automated backups and point-in-time recovery. Its free/credit terms may help a new account, but the product is less suitable as the simplest first path for this owner-managed, time-bounded staging mission. [5] [6] [7] |
| Google Cloud SQL MySQL trial | Not recommended for the required recovery proof | The 30-day trial provides a large trial instance but explicitly does not support backup/restore; it also assigns powerful default roles unless the owner further configures custom-role access. That does not meet NSOS’s recovery-evidence and least-privilege needs as cleanly. [8] [9] |
| Previous Aiven service | Rejected / do not reuse | The already documented NSOS staging attempt could not prove a target-only least-privilege boundary and was disposed. Reopening it would violate the containment decision. |

## Required Isolation Design

The following structure must be shown before NSOS connects to any staging database. Names are suggestions only and are not instructions to create resources without approval.

| Layer | Required state | Explicitly prohibited |
| --- | --- | --- |
| Provider account/project | A new or empty staging-only DigitalOcean project, labelled `nsos-staging`; no production database in the project. | Reusing a live NSOS database, the disposed Aiven target, or an ambiguous shared target. |
| Database cluster | One new MySQL cluster labelled `nsos-staging-mysql`, in a chosen region, initially empty apart from provider defaults. | Importing/copying production learner, guardian, staff, finance, admission, file, or provider data. |
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

The recommended entry node is documented by DigitalOcean as beginning at **$15/month** for 1 GiB RAM and 10–30 GiB storage; additional storage is listed at $0.21/GiB/month. Actual cost, tax, region availability, and billing terms must be confirmed by the account holder at checkout. [2]

The project should use a fixed stop rule: create no high-availability node, replica, migration, backup-retention extension, network add-on, or long-lived environment until the owner reviews the current checkout estimate. The environment should be deleted after the agreed evidence set is complete unless the owner separately approves ongoing staging retention and budget.

## Approval Required Before Provisioning

The owner must explicitly confirm all of the following in one approval before any provider service is created:

> I approve a new staging-only DigitalOcean project and one single-node Managed MySQL cluster for NSOS, limited to a temporary synthetic-data validation purpose. I approve an initial estimated provider spend only after I see the current checkout total. The database must be a fresh `nsos_staging` target with a separate least-privilege `nsos_staging_runtime` user and TLS-only application connection. No production data, live provider action, custom domain, real recipient, or public traffic is permitted. The environment must be deleted after the approved evidence collection unless I separately approve retention.

After that approval, NSOS must still stop and request a final confirmation before: (a) placing the staging TLS reference into protected secrets; (b) running the first migration; (c) conducting a synthetic restore rehearsal; and (d) initiating any progressive-load run.

## References

[1]: https://docs.digitalocean.com/products/databases/ "DigitalOcean Managed Databases documentation"
[2]: https://docs.digitalocean.com/products/databases/mysql/details/pricing/ "DigitalOcean Managed MySQL pricing"
[3]: https://docs.digitalocean.com/products/databases/mysql/how-to/manage-users-and-databases/ "DigitalOcean: manage MySQL users and databases"
[4]: https://docs.digitalocean.com/products/databases/mysql/how-to/modify-user-privileges/ "DigitalOcean: modify MySQL user privileges"
[5]: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.MySQL.CommonDBATasks.privilege-model.html "AWS RDS for MySQL privilege model"
[6]: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html "AWS RDS automated backups"
[7]: https://aws.amazon.com/rds/free/ "AWS RDS Free Tier"
[8]: https://docs.cloud.google.com/sql/docs/mysql/free-trial-instance "Google Cloud SQL for MySQL free trial"
[9]: https://docs.cloud.google.com/sql/docs/mysql/users "Google Cloud SQL MySQL user accounts"
