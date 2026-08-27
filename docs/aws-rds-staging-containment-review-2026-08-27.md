# AWS RDS Staging Containment Review — 27 August 2026

**Status:** **Contained but not approved for NSOS connection.** This record is based only on owner-supplied AWS console screenshots and official AWS documentation. It does not retain a password, endpoint, connection string, account identifier, security-group identifier, or other credential. No NSOS connection, database user, secret, migration, recovery rehearsal, load test, or provider-side change occurred during this review.

> The AWS RDS instance was initiated before the agreed configuration review was complete. The safe response is containment and evidence review—not credential sharing, connection, or retrospective approval.

## Observed Non-Secret State

| Control | Observed state | Assessment |
| --- | --- | --- |
| Instance status | Available | The resource exists and may accrue provider charges. |
| Engine and deployment | MySQL Community 8.4.9; Single-AZ | Appropriate only for temporary, non-production validation. It provides no high-availability evidence. |
| Instance/storage | `db.t4g.micro`; 20 GiB General Purpose SSD (`gp2`); storage autoscaling maximum 100 GiB | Small initial footprint, but the 100 GiB autoscaling ceiling creates a cost-control requirement. |
| Region | Stockholm (`eu-north-1`) | Location is recorded only as visible provider configuration; no production-data residency approval is implied. |
| Encryption | Enabled with the default AWS RDS key | Positive at-rest encryption control. |
| Backup | Automated backups enabled with one-day retention; one snapshot is visible | Provides a later recovery-test prerequisite only; no restore has been attempted. AWS permits DB-instance retention from 0 to 35 days; setting 0 disables automated backups. [4] |
| Public network exposure | Internet access gateway shown as disabled; no connected compute resource shown | Positive containment evidence. AWS notes that VPC security groups control database traffic and network access is off by default. [3] |
| Security-group summary | Provider console displays an inbound security-group source and an all-destination outbound rule; no public CIDR was shown in the supplied evidence | Do not infer a complete least-privilege proof from this summary. A future review must confirm that MySQL port 3306 has no public ingress and admits only an approved private application source. |
| Deletion protection | Disabled | Suitable for a disposable target but creates an accidental-deletion risk. No deletion is authorized by this record. |
| Monitoring | Enhanced Monitoring enabled; no alarms are configured | Metrics exist, but this is not a hosted NSOS alerting or incident-routing solution. |

The visible instance-compute rate at creation was **US$0.019/hour**, which is approximately **US$13.68 for 30 days of uninterrupted instance runtime** before storage, backup-storage, transfer, tax, and any other AWS charges. This calculation is a bounded runtime estimate, not a quote or a commitment; the account holder must use the live AWS estimate/billing view before retaining the instance.

## Connectivity Decision

The current private-network posture is safer than making the database publicly accessible. It also means the managed NSOS runtime cannot be assumed to reach the database: NSOS has no documented fixed AWS VPC attachment or egress IP that can be safely admitted to an RDS security group. AWS security-group rules require a specified source range or security group, and AWS describes private RDS access through VPC-connected resources or private-network connectivity. [2] [3]

| Option | Decision | Rationale |
| --- | --- | --- |
| Expose RDS publicly and allow broad IP access | **Rejected** | It would weaken the isolation boundary and does not solve the lack of a verified fixed NSOS egress source. |
| Create a MySQL runtime user or transfer the master password | **Blocked** | No verified private connection path exists, and the master credential must not be shared or stored in NSOS. |
| Attach an AWS-hosted staging runtime in the same VPC | **Possible only after separate architecture, cost, and security approval** | An application security group could be the MySQL ingress source, consistent with AWS’s VPC security-group model. [3] This would be a separate non-production runtime, not a change to the managed NSOS production runtime. |
| Retain the instance temporarily while deciding the connection architecture | **Requires explicit owner approval and a cost stop date** | Retention has a cost and no current NSOS staging value beyond contained configuration evidence. |
| Delete the instance and snapshots, then revisit staging architecture | **Safest current recommendation unless a private-runtime plan is approved promptly** | Stops charges and preserves the no-connection boundary. It requires an explicit owner authorization in AWS. |

## Required Next Approval

Choose one option explicitly:

1. **Contain and retain:** retain the RDS instance until a named date for a separately approved private AWS staging-runtime design. No credentials, users, connection, migration, recovery, or load work may occur meanwhile.
2. **Delete and stop charges:** delete the RDS instance and its snapshot(s) in AWS. This is a provider-side deletion and requires explicit confirmation immediately before execution.

Neither option authorizes connection of NSOS to RDS. Any future connection needs a separate staged plan covering a private application runtime, a target-only `nsos_staging_runtime` MySQL account, TLS verification, secret transfer through project settings only, synthetic data only, and a `SHOW GRANTS` evidence check.

## References

[1]: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_MySQL.html "Amazon RDS for MySQL"
[2]: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.html "Amazon VPC and Amazon RDS"
[3]: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.RDSSecurityGroups.html "Controlling access with security groups"
[4]: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html "Amazon RDS backup retention period"
