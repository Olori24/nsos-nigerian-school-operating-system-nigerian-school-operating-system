# NSOS Standalone Migration Runbook

## Migration invariants

1. Keep the existing MySQL engine and schema. Do not convert the 107-table MySQL application to PostgreSQL during this migration.
2. Preserve every existing user ID, `openId`, school ID, membership, role, school record, payment record, audit record, object key, and stored URL.
3. Never link a new provider identity to an existing account by email alone. The account owner must authenticate to the existing account and explicitly link the verified provider identity.
4. Keep the original `JWT_SECRET` and `VITE_APP_ID` until every encrypted provider/bank value has been recovered and the legacy session transition is verified. The JWT secret also derives encryption keys for stored provider credentials, advertising credentials, and bank-account values.
5. Keep private objects behind the authenticated NSOS storage proxy. Do not make the object bucket public.
6. Do not change production DNS, live traffic, production database rows, production secrets, or provider callback settings until a separate final cutover approval.

## Current independent-provider adapters

### Object storage

The application supports three modes:

| `STORAGE_PROVIDER` | New uploads | Reads | Intended use |
|---|---|---|---|
| `forge` | Legacy storage | Legacy storage | Current compatibility mode |
| `dual` | Writes to both stores | Legacy storage | Migration period after S3 staging is provisioned |
| `s3` | S3-compatible storage | S3-compatible storage | Only after every referenced legacy object is copied and byte-verified |

Configure the S3-compatible target with:

- `S3_ENDPOINT` (optional for AWS S3; required for an S3-compatible endpoint such as R2)
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_FORCE_PATH_STYLE` (provider-specific)

New objects use the provider-neutral `/storage/{key}` route. The old `/manus-storage/{key}` route remains as a compatibility alias so existing database URLs continue to resolve. Both routes pass through the same tenant, membership, role, and object-scope authorization checks.

The migration script inventories the six storage-reference columns used by school knowledge sources and revisions, website media, admission documents, curriculum imports, and family payment evidence. It is read-only by default. Copy mode:
- requires a read-only MySQL account;
- requires `--copy`;
- requires `STORAGE_MIGRATION_APPROVED=true`;
- requires `STORAGE_MIGRATION_TARGET=staging`;
- requires `STORAGE_MIGRATION_TARGET_BUCKET` to exactly match `S3_BUCKET`;
- downloads each legacy object, uploads it under the same key, downloads it again from S3, and compares SHA-256 and byte length;
- never updates the production database and never deletes legacy objects.

Run an inventory only:

```bash
STORAGE_MIGRATION_SOURCE_READ_ONLY=true pnpm storage:migrate:s3
```

Run a separately approved staging copy only after the isolated bucket and credentials are ready:

```bash
STORAGE_MIGRATION_SOURCE_READ_ONLY=true \
STORAGE_MIGRATION_APPROVED=true \
STORAGE_MIGRATION_TARGET=staging \
STORAGE_MIGRATION_TARGET_BUCKET="$S3_BUCKET" \
pnpm storage:migrate:s3 -- --copy
```

Do not set `STORAGE_PROVIDER=s3` until the complete object inventory has been copied and independently verified. Keep `dual` mode during the copy window so new uploads are mirrored while reads remain on the legacy store.

### AI provider

The existing Forge provider remains available during transition. An independent OpenAI-compatible provider can be configured with:

- `LLM_PROVIDER=openai-compatible`
- `LLM_API_BASE_URL`
- `LLM_API_KEY`
- `LLM_MODEL`

For Gemini's OpenAI-compatible endpoint, the base URL is:

`https://generativelanguage.googleapis.com/v1beta/openai`

The configured model is explicit. Do not switch production AI traffic until tool calls, structured output, image inputs, long-context requests, and every NSOS AI workflow have passed provider-specific staging tests.

### Notifications and SMS callbacks

- Owner notifications use the existing Resend integration and the optional `OWNER_NOTIFICATION_EMAIL`.
- `PUBLIC_APP_URL` is the canonical application origin and is required in production.
- Add additional exact HTTPS origins to `AUTH_ALLOWED_ORIGINS` as comma-separated values. `*.nsos.top` school subdomains are accepted.
- Do not update Termii/Twilio provider callback settings until final cutover approval. The callback URLs returned by NSOS now derive from `PUBLIC_APP_URL`.

### Authentication and legacy account preservation

Existing accounts retain their original user IDs and school relationships. The account-linking flow requires:
- an active session for the existing NSOS account;
- a verified Google identity or a verified email magic link;
- the provider email to match the existing account email;
- a browser-bound state and session check;
- a unique provider-subject constraint.

An existing legacy email match is not silently converted into a new external user. Sign-in with that email is blocked until the account owner signs into the existing account and explicitly links the new identity.

The legacy sign-in bridge remains enabled by default during the migration period. Retire it only after a production read-only audit proves that every active legacy account that must remain accessible has a verified linked identity and the owner approves the cutover.

For the final standalone cutover, configure:

- `LEGACY_MANUS_AUTH_ENABLED=false`
- `VITE_LEGACY_LOGIN_ENABLED=false`

The legacy callback then returns HTTP 410 and the legacy sign-in control is hidden. Do not apply these flags while any required account remains unlinked.

## Zero-dollar infrastructure assessment (2026-11-10)

The owner has set a hard infrastructure budget of **USD 0 per month until NSOS earns revenue**. Do not create paid resources, start a free trial that can auto-convert, upgrade the tenancy to Pay As You Go, attach paid add-ons, or accept usage-based overages. No credit card or billing authorization is implied by this plan.

### Preferred staging candidate: OCI Always Free

Oracle Cloud Infrastructure (OCI) documents a set of Always Free resources available for the life of an account in its home region. This is the strongest currently identified zero-dollar candidate because it offers a managed MySQL option and private object storage without changing NSOS's database engine.

Official references:
- OCI Always Free resources: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- MySQL HeatWave Always Free DB system: https://docs.oracle.com/en-us/iaas/mysql-database/doc/creating-always-free-db-system.html
- MySQL HeatWave service limitations: https://docs.oracle.com/en-us/iaas/mysql-database/doc/features-mysql-heatwave-service.html
- OCI S3 compatibility API: https://www.oracle.com/cloud/storage/object-storage/faq/

Documented capacity and limitations:
- **Compute:** up to 2 total Ampere A1 OCPUs and 12 GB RAM, subject to home-region availability. Always Free compute instances may be reclaimed when Oracle's documented 7-day CPU, network, and (for A1) memory utilization thresholds are all below 20%. This is not a production availability guarantee.
- **MySQL:** one Always Free MySQL HeatWave DB system using the MySQL.Free shape, fixed 50 GiB storage, and optional one-node HeatWave.Free cluster. The service is MySQL 8.0+ with InnoDB support, but its version is automatically updated to the latest release. Oracle changed the default version for new DB systems to MySQL 9.7 LTS on 2026-09-29, while NSOS CI currently validates MySQL 8.4. Before accepting this target, run the complete migration chain, schema checks, and application integration suite against the actual Always Free DB version; do not assume the 8.4 CI result proves 9.7 compatibility. Automatic backups retain one day; manual backups, point-in-time recovery, high availability, read replicas, SLA and Oracle Support are not included. Treat this as an isolated staging database only, never as the sole production database or backup.
- **Object storage:** 20 GB combined Always Free object storage and 50,000 API requests per month in an Always Free-only account. Keep the bucket private. The S3 compatibility API supports Signature V4 and path-style or virtual-hosted requests, but does not implement every S3 API.
- **Network and capacity:** resources must remain in the tenancy home region to qualify for Always Free. Region capacity can prevent provisioning. Do not move resources to another region if that would create a billable resource.

### Staging topology to validate

1. One Always Free A1 VM for the NSOS staging application, reverse proxy, and operational monitoring.
2. One Always Free MySQL HeatWave DB system, isolated from production and reachable only from the staging VM/network.
3. One private OCI Object Storage bucket for synthetic staging files. Configure the AWS SDK S3 endpoint using the namespace and home-region compatibility endpoint, Signature V4 credentials, and path-style access where required.
4. A separate staging hostname and secrets. Do not point staging to `nsos.top`, production OAuth callbacks, production email lists, production database, or production object storage.

The current NSOS S3 adapter uses `PutObject`, `GetObject`, and presigned `GetObject` URLs. OCI's compatibility layer does not promise complete S3 parity, so validate all three operations with synthetic objects, including signed URL expiry, content type, byte-for-byte download verification, and denial of anonymous access, before accepting OCI storage. Do not copy any production object until the isolated staging tests pass and a separate approval is obtained.

### Hard zero-spend controls

- Use only resources explicitly labelled **Always Free** in the OCI console. Do not provision a resource whose cost estimate is non-zero or whose eligibility is unclear.
- Do not upgrade to Pay As You Go, enable paid support, or create paid load balancers, NAT gateways, databases, storage tiers, backups, observability add-ons, or AI services.
- Use OCI compartment quotas and service limits to constrain resource creation where supported. Check the tenancy's usage and billing pages before and after each provisioning step.
- Keep object storage below 20 GB and API calls below 50,000 per month; do not rely on an overage being blocked automatically.
- Keep compute and database staging workloads small. Do not use the free VM as a production availability promise; the documented idle-reclamation policy and absence of database SLA make this a staging candidate only.
- If the account requires a paid upgrade, billing commitment, or non-zero resource, stop and report the blocker. Do not proceed.

**Provisioning status:** Not provisioned. No OCI tenancy has been confirmed in the connected workspace, and no cloud resource, billing setting, credential, database, bucket, or network has been created or changed.

## Staging and data-verification sequence

1. Provision an isolated MySQL staging database, a private S3-compatible staging bucket, and a separate staging application deployment. Do not reuse production credentials or connect staging to the production database.
2. Confirm a recoverable production backup and test restoring it to a separate isolated database. For any test containing real learner or family records, restrict access to approved migration operators and delete the staging copy after acceptance.
3. Run the repository migration chain against a clean MySQL 8.4 database. Then restore the approved source snapshot into staging and compare table inventory, exact row counts, key uniqueness, migration history, user/school/membership counts, and critical tenant relationships.
4. Run the read-only storage inventory. Copy referenced objects to the private staging bucket and verify every object by SHA-256 and byte length. Keep the legacy source objects intact.
5. Test Google/email sign-in, explicit account linking, session revocation, owner authorization, cross-school isolation, private file access, public published media, payments, provider callbacks, Resend, AI workflows, school setup, and all role-specific dashboards.
6. Run security tests, production dependency audit, TypeScript, lint, formatting, full unit/integration tests, MySQL migrations, snapshot drift validation, and the production build.
7. Test a private staging deployment and a restore/rollback procedure. Production DNS and traffic remain unchanged.
8. Prepare a cutover checklist and request separate explicit approval before changing production secrets, database, storage provider, callback URLs, DNS, or live traffic.

## Known blockers before a real staging deployment

- The existing Vercel project currently has no configured environment variables, so it is not a functional staging environment.
- No isolated staging MySQL database or private S3-compatible bucket has been provisioned.
- The original production `JWT_SECRET` has not yet been recovered or proven available. Do not rotate it: doing so can make encrypted provider credentials and bank-account values unrecoverable.
- The full production database and object inventory have not been exported or restored into staging.
- Legacy account-linking coverage has not yet been measured against production users.

No production data, DNS, secrets, or traffic are changed by this runbook or by the migration branch itself.
