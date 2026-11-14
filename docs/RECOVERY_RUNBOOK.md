# NSOS Recovery Runbook

## Recovery objective

Restore an isolated NSOS staging environment from a known-good database backup without touching production data.

## Required evidence before production launch

- automated/scheduled database backup is configured at the hosting layer
- retention policy is documented
- backup integrity is verified
- a restore has been rehearsed on isolated staging
- restore duration is measured
- application migrations are replayable
- object-storage recovery is documented
- secrets/configuration recovery is documented without storing secrets in Git
- owner/operator sign-off is recorded

## Restore procedure

1. Freeze high-impact staging mutations.
2. Provision a clean isolated database.
3. Restore the selected backup.
4. Apply the exact NSOS migration state.
5. Verify tenant count and key table integrity.
6. Verify authentication and tenant isolation.
7. Verify critical read paths.
8. Verify file/object references.
9. Record restore duration and anomalies.
10. Release the staging freeze only after verification.

## CI synthetic backup/restore smoke

The CI workflow includes a synthetic MySQL 8.4 backup/restore rehearsal after migrations:

1. Create a marker row in the ephemeral CI database.
2. Dump the migrated schema and data with a consistent transaction snapshot.
3. Restore into a separate `nsos_restore` database.
4. Compare source/restore table and column counts and verify the marker row.
5. Drop the restore database and marker table during cleanup.

This test is restricted to GitHub Actions and the ephemeral MySQL service. It is useful regression evidence for the dump/restore procedure, but it does **not** prove that a managed production backup is valid, that production retention is configured, or that RPO/RTO targets are met. An isolated staging restore using the actual managed backup remains a required launch gate.

## Production safety

Never rehearse restore directly against production. Production recovery requires a separately approved incident procedure and an explicit change window.

## Exit criteria

A recovery drill passes only when the restored environment can boot, authenticate, preserve tenant boundaries, execute critical read paths, and demonstrate that the application and database migration state are compatible.
