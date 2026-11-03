# NSOS Vercel Migration — Preview Track

Status: ADAPTER IMPLEMENTED ON ISOLATED BRANCH — PREVIEW NOT YET DEPLOYED.
Base: main at 87fac79eb0ab9f9159643f2263a1eb3347f568b9
Branch: migration/vercel-preview
Draft PR: https://github.com/Olori24/nsos-nigerian-school-operating-system-nigerian-school-operating-system/pull/48

## Verified current runtime

- React 19 + Vite frontend.
- Express 4 + tRPC API, OAuth/email authentication, SMS webhooks, affiliate routes, storage proxy, security middleware.
- Production build emits dist/public and bundles the complete Express server to dist/index.js.
- MySQL/TiDB via Drizzle and S3-compatible object storage are external dependencies.
- Existing managed-host startup remains in server/_core/index.ts and still owns its HTTP listener.

## Implemented on migration/vercel-preview

1. Extracted the existing middleware and route registration into server/_core/app.ts. The existing managed-host entrypoint now calls this factory before starting its HTTP server.
2. Added root index.ts as Vercel's recognized Express entrypoint. It exports the Express app and does not call listen().
3. Added Vercel function configuration to disable platform body parsing so webhook handlers can consume their own request streams.
4. Kept SMS webhook routes before the general JSON and URL-encoded parsers. Termii continues to verify the raw request bytes; Twilio continues to parse its signed form fields.
5. Isolated static-file serving from the Vite development runtime so Vite and its plugins are not pulled into the Vercel function bundle.
6. Added build:vercel and scripts/prepare-vercel-assets.mjs to stage the Vite output into the root public/ directory for Vercel's static CDN. The generated directory is ignored by Git.
7. Added an SPA fallback that serves the built index.html for client-side routes while returning JSON 404s for unknown server routes.
8. Updated CI to use Node 24 and run the Vercel asset-staging build.

## Vercel project state

- Project: nsos-vercel-migration
- Framework: Express
- Node.js: 24.x
- Build command: pnpm build:vercel
- Git repository: Olori24/nsos-nigerian-school-operating-system-nigerian-school-operating-system
- SSO protection: enabled for deployment URLs
- Preview deployments: disabled
- Environment variables: none configured
- Deployments: none
- Domains: none

## Remaining verification gates

1. Obtain passing CI evidence for lint, formatting, typecheck, database migrations, full tests, and Vercel asset staging.
2. Configure preview-only credentials for a separate non-production database and object-storage bucket. Required core runtime settings include VITE_APP_ID, JWT_SECRET (at least 32 characters), DATABASE_URL, and OAUTH_SERVER_URL. Additional feature-specific provider credentials must remain test-only or disabled.
3. Confirm database connection pooling and cold-start behavior under Vercel's runtime.
4. Smoke-test the actual protected preview: SPA deep links, health endpoint, tRPC, OAuth callback, passwordless auth, Termii raw-body signature validation, Twilio form signature validation, storage authorization, uploads, rate limits, security headers, and tenant isolation.
5. Review function size and runtime logs. The preview must not send live SMS/email, create real payment transactions, or write to production data.
6. Only after all evidence is clean should preview deployments be enabled.

## Data and operational safeguards

- No production database migrations or writes from a preview.
- No production learner, family, finance, or operational records in preview tests.
- No live SMS, email, payment, DNS, or domain-side effects.
- Keep main and the existing live deployment unchanged.
- Preserve the existing mail provider's MX, SPF, DKIM, and DMARC records.
- Do not attach nsos.top or change nameservers during this migration phase.

## Acceptance criteria

- A protected Vercel preview URL loads the full NSOS application, not only the static shell.
- API health, auth entry points, tRPC, webhooks, and storage routes pass smoke tests with safe fixtures.
- Database and object storage point only to isolated preview resources.
- Existing tenant isolation, same-origin mutation checks, rate limits, security headers, and observability remain active.
- All automated checks pass and a concise evidence report is attached before any production decision.

## Current decision

The serverless Express adapter and Vercel build path are now implemented on the migration branch, but they are not yet verified by CI or a real preview deployment. Keep preview deployments disabled until CI passes and isolated preview credentials are configured. No production release or DNS cutover is authorized by this work.
