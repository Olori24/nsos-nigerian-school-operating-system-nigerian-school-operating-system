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

## Production safety

Never rehearse restore directly against production. Production recovery requires a separately approved incident procedure and an explicit change window.

## Exit criteria

A recovery drill passes only when the restored environment can boot, authenticate, preserve tenant boundaries, execute critical read paths, and demonstrate that the application and database migration state are compatible.
