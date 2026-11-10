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
