# NSOS Recovery Runbook

**Evidence status:** This is an operational runbook, not evidence that backups, restore testing, or disaster recovery targets are complete.

## Required recovery evidence

| Area                      | Evidence required before claiming readiness                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Database                  | Backup schedule, retention, integrity evidence, an isolated restore rehearsal, measured recovery time, and outcome validation. |
| Object storage            | Object inventory, backup/replication approach, restoration test, and access-control validation.                                |
| Schema                    | Replayable migrations with journal and compatibility checks against an isolated target.                                        |
| Secrets and configuration | An owner-controlled recovery inventory without secret values, rotation procedure, and post-restore verification.               |
| Operations                | Named abort authority, incident log, recovery steps, communication path, and final sign-off.                                   |

## Safety boundary

Recovery rehearsals must use an isolated environment, synthetic or expressly authorized data, non-production providers, no real recipients, and an explicit deletion boundary. Never run a destructive restore or production workload as a documentation exercise.
