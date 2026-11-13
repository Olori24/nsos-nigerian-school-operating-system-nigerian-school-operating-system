# NSOS legacy object-storage migration

The Vercel application writes new objects to the configured S3-compatible bucket. Existing objects created through the former Forge storage API remain readable through a temporary, read-only fallback when `LEGACY_STORAGE_FORGE_API_URL` and `LEGACY_STORAGE_FORGE_API_KEY` are configured.

## Required staging configuration

Configure these GitHub Actions secrets in the `staging` environment:

- `STAGING_DATABASE_URL`: staging MySQL/TiDB connection string
- `LEGACY_STORAGE_FORGE_API_URL` and `LEGACY_STORAGE_FORGE_API_KEY`: read access to the previous Forge storage
- `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`: destination bucket credentials
- `S3_ENDPOINT`: optional HTTPS AWS S3 or Cloudflare R2 endpoint

Configure `NSOS_STAGING_DATABASE_NAME` as an environment variable. `S3_REGION` is optional and defaults to `auto`.

## Procedure

1. Run **NSOS Legacy Storage Migration** manually with mode `dry-run`. It inventories distinct keys in database columns named `storageKey`, `fileKey`, and `evidenceFileKey`. It performs no object writes.
2. Confirm the selected database is staging and review the inventory output.
3. Run the workflow again with mode `apply` and confirmation `MIGRATE_STAGING_OBJECTS`.
4. The script copies objects without changing their keys, skips objects already present in the destination, verifies each uploaded object with a HEAD request, and stops on errors.
5. Re-run dry-run/apply as needed, then verify representative school website media, admission documents, knowledge-library files, curriculum imports, and payment evidence in staging.
6. Keep the legacy read-only Forge credentials until verification is complete. Remove them only after all referenced legacy objects are confirmed in the new bucket.

## Safety controls

- The workflow is manual and uses the GitHub `staging` environment.
- Apply mode requires the staging environment marker, an explicit database-name allow-list, and the exact confirmation phrase.
- The script rejects Vercel Production runtime, non-HTTPS provider URLs, untrusted signed-object hosts, unsafe keys, and objects larger than 50 MB.
- It never deletes source objects, rewrites database references, or writes to the legacy provider.
- Large objects above 50 MB require a separate approved migration process.
