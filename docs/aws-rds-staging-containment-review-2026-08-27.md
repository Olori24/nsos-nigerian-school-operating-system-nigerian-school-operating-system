# AWS RDS Staging Containment Review — 27 August 2026

**Status:** **Disposed after owner-confirmed deletion; not approved and no longer available for NSOS connection.** This record is based only on owner-supplied AWS console screenshots and official AWS documentation. It does not retain a password, endpoint, connection string, account identifier, security-group identifier, or other credential. No NSOS connection, database user, secret, migration, recovery rehearsal, or load test occurred.

> The AWS RDS instance was initiated before the agreed configuration review was complete. The safe response is containment and evidence review—not credential sharing, connection, or retrospective approval.

## Observed Non-Secret State Before Disposal

| Control | Observed state | Assessment |
| --- | --- | --- |
| Instance status | Available before deletion | The resource existed and could accrue provider charges before the owner-authorized disposal. |
| Engine and deployment | MySQL Community 8.4.9; Single-AZ | Appropriate only for temporary, non-production validation. It provides no high-availability evidence. |
| Instance/storage | `db.t4g.micro`; 20 GiB General Purpose SSD (`gp2`); storage autoscaling maximum 100 GiB | Small initial footprint, but the 100 GiB autoscaling ceiling creates a cost-control requirement. |
| Region | Stockholm (`eu-north-1`) | Location is recorded only as visible provider configuration; no production-data residency approval is implied. |
| Encryption | Enabled with the default AWS RDS key | Positive at-rest encryption control. |
| Backup | Automated backups enabled with one-day retention; one snapshot is visible | Provides a later recovery-test prerequisite only; no restore has been attempted. AWS permits DB-instance retention from 0 to 35 days; setting 0 disables automated backups. [4] |
| Public network exposure | Internet access gateway shown as disabled; no connected compute resource shown | Positive containment evidence. AWS notes that VPC security groups control database traffic and network access is off by default. [3] |
| Security-group summary | Provider console displays an inbound security-group source and an all-destination outbound rule; no public CIDR was shown in the supplied evidence | Do not infer a complete least-privilege proof from this summary. A future review must confirm that MySQL port 3306 has no public ingress and admits only an approved private application source. |
| Deletion protection | Disabled before deletion | Supported disposal after explicit owner authorization; it did not authorize deletion by itself. |
| Monitoring | Enhanced Monitoring enabled; no alarms are configured | Metrics exist, but this is not a hosted NSOS alerting or incident-routing solution. |

The visible instance-compute rate at creation was **US$0.019/hour**, which is approximately **US$13.68 for 30 days of uninterrupted instance runtime** before storage, backup-storage, transfer, tax, and any other AWS charges. This calculation was a bounded runtime estimate, not a quote or a commitment. It does not establish the final AWS charge or billing-close time after deletion.

## Owner-Confirmed Disposal Evidence

After the owner selected the deletion option and provided final deletion confirmation, disposal was completed only through the owner’s AWS console. The agent did not access the AWS account, credentials, instance endpoint, database contents, or any unrelated resource.

| Evidence | Non-secret observed result | Interpretation |
| --- | --- | --- |
| RDS database list | `Databases (0)` and “No resources to display” in Stockholm | `nsos-staging-mysql` was no longer listed. |
| Manual and shared snapshots | Both views reported `0` | No matching manual or shared snapshot remained. |
| System snapshot attempt | One system snapshot named for `nsos-staging-mysql` was initially visible; AWS rejected direct deletion and instructed deletion of the retained automated backup for the deleted instance | This was an AWS-managed retained-backup path, not a separate manual snapshot. |
| Retained automated backups | The final **Retained** view reported `Retained backups (0)` and “No retained backups found” | The owner confirmed deletion of the retained automated backup. AWS documents this as the console route for deleting a retained automated backup after its source instance is deleted. [5] |

The screenshots also showed a current-region backup count while its list was loading. It was not opened, identified, or changed because it was not established as related to `nsos-staging-mysql`.

> **Disposal conclusion.** The owner-authorized target instance and its matching retained automated backup were removed on 27 August 2026. This is provider-console evidence of disposal, not a billing statement: AWS may still display prorated or delayed charges according to its billing process.

## Connectivity Decision

The current private-network posture is safer than making the database publicly accessible. It also means the managed NSOS runtime cannot be assumed to reach the database: NSOS has no documented fixed AWS VPC attachment or egress IP that can be safely admitted to an RDS security group. AWS security-group rules require a specified source range or security group, and AWS describes private RDS access through VPC-connected resources or private-network connectivity. [2] [3]

| Option | Decision | Rationale |
| --- | --- | --- |
| Expose RDS publicly and allow broad IP access | **Rejected** | It would weaken the isolation boundary and does not solve the lack of a verified fixed NSOS egress source. |
| Create a MySQL runtime user or transfer the master password | **Blocked** | No verified private connection path exists, and the master credential must not be shared or stored in NSOS. |
| Attach an AWS-hosted staging runtime in the same VPC | **Possible only after separate architecture, cost, and security approval** | An application security group could be the MySQL ingress source, consistent with AWS’s VPC security-group model. [3] This would be a separate non-production runtime, not a change to the managed NSOS production runtime. |
| Retain the instance temporarily while deciding the connection architecture | **Requires explicit owner approval and a cost stop date** | Retention has a cost and no current NSOS staging value beyond contained configuration evidence. |
| Delete the instance and snapshots, then revisit staging architecture | **Safest current recommendation unless a private-runtime plan is approved promptly** | Stops charges and preserves the no-connection boundary. It requires an explicit owner authorization in AWS. |

## Current Staging Boundary

This accidental RDS path is closed. Its deletion does not establish a usable staging environment, recovery evidence, capacity evidence, or a future AWS architecture. New staging-provider, database, recovery, and load activity remains paused until a future independently verifiable non-production route is separately approved.

Any future connection design must start as a new proposal covering a private application runtime, a target-only `nsos_staging_runtime` MySQL account, TLS verification, secret transfer through project settings only, synthetic data only, and a `SHOW GRANTS` evidence check. Neither this historical record nor the deletion authorization carries forward as approval for that work.

## References

[1]: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_MySQL.html "Amazon RDS for MySQL"
[2]: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.html "Amazon VPC and Amazon RDS"
[3]: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.RDSSecurityGroups.html "Controlling access with security groups"
[4]: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html "Amazon RDS backup retention period"
[5]: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups-Deleting.html "Deleting retained automated backups"
