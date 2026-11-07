# NSOS Portable Container Deployment

**Status:** Docker image build and synthetic process smoke passed on commit `e7b4271`; isolated staging and production deployment remain unverified.

## Purpose

The Dockerfile packages the existing React/Vite client and Express/tRPC server as one Node.js service. Docker Compose is a portable single-service runtime definition. It does not replace the managed Manus deployment, migrate data, create infrastructure, or change DNS.

## Build and run

1. Install Docker Engine **28.0.0 or later** and Docker Compose plugin **2.24.0 or later** on the target host. The Compose minimum is required for the documented single-quote escape handling. This minimum is a security prerequisite for the loopback port binding used below: older Docker Engine versions can allow hosts on the same layer-2 network to reach ports published to localhost. If an older engine must be used, do not rely on the loopback binding; first enforce and verify host/network firewall controls that block access to the published port from every non-host interface. Record the Engine version and the applicable network-control evidence before starting the service. Do not proceed if neither condition can be met.
2. Copy `docker.env.example` to `.env`.
3. Fill the required public application/OAuth portal values and the server-only production values using the target environment's secure secret manager.
4. Confirm `DATABASE_URL` points to a dedicated isolated staging database for staging work.
5. Build and start:

```sh
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=100 nsos
```

6. Verify the process health endpoint:

```sh
curl --fail --silent "http://${NSOS_HOST_IP:-127.0.0.1}:${NSOS_HOST_PORT:-3000}/healthz"
```

The endpoint proves only that the HTTP process is running. It does not prove database connectivity, authentication, tenant isolation, provider delivery, or production readiness.

The Compose port is bound to `127.0.0.1` by default. Set `NSOS_HOST_IP` only to a specific host interface reachable by a separately secured TLS-terminating ingress; do not use `0.0.0.0` or expose the plain HTTP port directly to untrusted networks. `NSOS_HOST_PORT` remains configurable.

## Secret continuity and encrypted data

**Do not generate a new JWT_SECRET and point the container at the existing production database.**

Use Docker Compose plugin **2.24.0 or later**. Verify with `docker compose version`. Compose `.env` parsing must preserve the exact secret bytes: single-quoted values are literal, while unquoted and double-quoted values are subject to interpolation. For a value containing a single quote, escape it as `\\'` inside the surrounding single quotes; this escape handling is why the minimum Compose version is required. For a value ending in a backslash, do not use the single-quoted form because the final backslash can escape the closing quote. Use a double-quoted form with `$` doubled and backslashes escaped instead. For example, the synthetic value `foo$bar\\` is represented as `JWT_SECRET=\"foo$$bar\\\\\"` and must resolve to `foo$bar\\` inside the container. Prefer high-entropy secrets encoded with a Compose-safe alphabet (letters, digits, `_`, and `-`) for newly generated environments.

Before connecting to any database, verify the resolved value inside the candidate container without printing or logging it: compare its byte length and a keyed digest computed inside the trusted environment against an independently computed reference, and ensure neither value is emitted to terminal history, CI logs, or observability. Do not share `docker compose config` output because it may print resolved environment values. If the existing secret uses characters not covered by the documented cases, stop and validate the exact Compose parser behaviour in an isolated disposable environment before use.

NSOS currently derives the session-signing key and encryption keys for provider credentials, Meta advertising access tokens, and school bank-account numbers from `JWT_SECRET`. Replacing that value invalidates existing sessions and makes ciphertext created with the previous key unreadable.

- If this container must use the existing database, it must receive the exact existing secret through a secure secret-management channel. Never copy it into this repository, an issue, logs, or this document.
- If the original secret cannot be recovered, do not connect a replacement-key container to the existing database until an owner-approved encrypted-data inventory and secure re-entry or separately reviewed migration plan is complete.
- For isolated staging, use a separate synthetic database and a newly generated staging-only secret. Never restore production ciphertext into that staging database unless an approved, tested sanitization and migration process explicitly covers it.

## Isolation requirements for staging

Use separate staging resources for:

- application deployment and secret set;
- MySQL/TiDB database and database user;
- object-storage bucket/prefix and credentials;
- OAuth application/client configuration;
- provider stubs or non-production provider accounts;
- observability destination and retention policy.

Use synthetic school, staff, learner, guardian, invoice, admissions and document records only. Do not connect live payment, email, SMS, WhatsApp, advertising, or AI-provider credentials. Do not run schema migrations against production as part of staging validation.

## Runtime security

- Run as the unprivileged `node` user.
- The container filesystem is read-only except for a bounded temporary filesystem at `/tmp`.
- Linux capabilities are dropped and privilege escalation is disabled.
- Secrets are injected at runtime through the uncommitted `.env` file for local controlled use, or a deployment platform's encrypted secret manager in hosted environments.
- Do not expose the application port publicly until TLS termination, ingress restrictions, backups, monitoring, and an incident rollback procedure are configured.

## Deployment and rollback

Keep the existing Manus deployment and domain routing unchanged until the container is independently built, started, tested, backed up, and approved. Do not point `nsos.top` or wildcard school subdomains at an unverified container.

For rollback, stop the candidate container and restore the previous approved hosting target. Database rollback is a separate operation and must use a rehearsed backup/restore plan; do not assume an application image rollback reverses schema changes.

## Acceptance gates

| Gate | Evidence required | Current state |
|---|---|---|
| Image build | Docker image build workflow passed on commit `e7b4271` (run #6) | PASS — image build only |
| Process smoke | Container starts with synthetic runtime configuration and `/healthz` returns 200 on commit `e7b4271` (run #6) | PASS — process health only |
| Isolated staging | Dedicated DB, storage namespace, secrets, OAuth and provider stubs verified | Blocked until provisioned |
| Authentication | Synthetic user sign-in/session lifecycle passes | Not run |
| Tenant isolation | Cross-tenant and role boundary tests pass against staging | Not run |
| Recovery | Staging backup restore and rollback rehearsal recorded | Not run |
| Production | Owner-approved cutover plan and verified rollback | Not authorized |

A successful image build or `/healthz` response must not be represented as a successful staging deployment or production release. The recorded smoke evidence is tied to commit `e7b4271`; later documentation-only changes do not expand what that run proves.


### Current runtime dependency note

The server entrypoint currently imports `serveStatic` and `setupVite` from the same `server/_core/vite.ts` module. That module statically imports Vite and its configuration plugins even in production mode. Until the development-only Vite imports are separated from the production entrypoint and verified through the normal test suite, the container runtime copies the locked full dependency tree from the build stage rather than using a production-only install. This increases image size and installed package surface; it is an explicit compatibility trade-off, not a claim that development dependencies are required by the business runtime. A follow-up refactor should split static serving from Vite development middleware, then prove the production bundle starts with production-only dependencies before reducing the image.
