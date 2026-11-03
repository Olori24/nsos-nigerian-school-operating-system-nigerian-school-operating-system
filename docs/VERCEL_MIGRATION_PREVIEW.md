# NSOS Vercel Migration — Preview Track

Status: PREPARATION ONLY — no production cutover authorized.
Base: main at 87fac79eb0ab9f9159643f2263a1eb3347f568b9
Branch: migration/vercel-preview

## Verified current runtime

- React 19 + Vite frontend.
- Express 4 + tRPC API, OAuth/email authentication, SMS webhooks, affiliate routes, storage proxy, security middleware.
- Production build emits dist/public and bundles the complete Express server to dist/index.js.
- Current process starts its own HTTP listener in server/_core/index.ts.
- MySQL/TiDB via Drizzle and S3-compatible object storage are external dependencies.
- No root vercel.json or Vercel-specific request handler exists on main.

## Migration constraint

Do not deploy the current Vite output as a static-only site: that would omit the Express API and authentication/webhook/storage routes. Do not use the existing self-starting server entry as a Vercel Function unchanged; it calls server.listen() and starts process-level behavior.

## Required implementation before a working preview

1. Extract application construction and middleware registration from server/_core/index.ts into an importable createApp() module. Keep the existing managed-host startServer() entry intact and make it consume createApp().
2. Add a Vercel Node.js Function entry that exports the Express app/request handler without calling listen().
3. Add Vercel routing so API, auth, webhook, affiliate, storage and health routes reach the function, while static assets and SPA fallback continue to work.
4. Verify request body limits, streaming/file uploads, cookie/proxy behavior, OAuth callback URLs, webhook raw-body/signature requirements, and cold-start initialization.
5. Use isolated preview-only credentials and a non-production database/object-storage bucket. Never copy production secrets into the preview automatically.
6. Run typecheck, lint, full tests, production build, and preview smoke tests before treating preview as usable.

## Data and operational safeguards

- No database migrations or writes against production from a preview.
- No production learner, family, finance, or operational records in preview tests.
- No live SMS, email, payment, DNS, or domain-side effects.
- Keep main and the existing live deployment unchanged.
- Preserve the existing mail provider's MX, SPF, DKIM, and DMARC records.
- Do not attach nsos.top or change nameservers during this migration phase.

## Acceptance criteria

- A Vercel preview URL loads the full NSOS app, not only the static shell.
- API health, auth entry points, tRPC, webhooks and storage routes have been smoke-tested with safe fixtures.
- Database and object storage point only to isolated preview resources.
- Existing tenant isolation, same-origin mutation checks, rate limits, security headers and observability remain active.
- All automated checks pass and a concise evidence report is attached before any production decision.

## Current decision

The Vercel project may be created and connected for migration work, but preview deployments must remain disabled until the serverless adapter, routing, and isolated preview environment are implemented and reviewed. A project connection alone is not evidence of a working deployment.
