# NSOS Portable Container Deployment

**Status:** Docker image build and synthetic process smoke passed on commit `e7b4271`; isolated staging and production deployment remain unverified.

## Purpose

The Dockerfile packages the existing React/Vite client and Express/tRPC server as one Node.js service. Docker Compose is a portable single-service runtime definition. It does not replace the managed Manus deployment, migrate data, create infrastructure, or change DNS.

## Build and run

1. Install Docker Engine **28.0.0 or later** and the Docker Compose plugin on the target host. This minimum is a security prerequisite for the loopback port binding used below: older Docker Engine versions can allow hosts on the same layer-2 network to reach ports published to localhost. If an older engine must be used, do not rely on the loopback binding; first enforce and verify host/network firewall controls that block access to the published port from every non-host interface. Record the Engine version and the applicable network-control evidence before starting the service. Do not proceed if neither condition can be met.
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
HOST_BINDING="$(docker compose port nsos 3000)"
curl --fail --silent --show-error "http://${HOST_BINDING}/healthz"
```

The endpoint proves only that the HTTP process is running. It does not prove database connectivity, authentication, tenant isolation, provider delivery, or production readiness.

The Compose port is bound to `127.0.0.1` by default. Set `NSOS_HOST_IP` only to a specific host interface reachable by a separately secured TLS-terminating ingress; do not use `0.0.0.0` or expose the plain HTTP port directly to untrusted networks. `NSOS_HOST_PORT` remains configurable.

## Secret continuity and encrypted data

**Do not generate a new JWT_SECRET and point the container at the existing production database.**

`JWT_SECRET` is deliberately excluded from `.env`. Docker Compose parses `.env` values and special characters, quotes, dollar signs, and trailing backslashes can be interpreted differently across versions. The Compose service receives `JWT_SECRET` only from the invoking process environment using Compose's pass-through form (`- JWT_SECRET`). It does not interpolate the secret from `.env`; if the shell variable is absent, the container receives no `JWT_SECRET`, even if an older `.env` file still contains one. This allows image builds and management commands such as `docker compose logs` and `docker compose down` to run without the runtime secret. Starting the application without the exact secret will fail its startup guard and is not a valid deployment.

For an interactive local session, enter the value silently and keep it out of shell history:

```sh
docker compose build

# Preserve every byte of the existing secret, including leading/trailing whitespace.
set +x
IFS= read -r -s -p 'Existing JWT_SECRET: ' JWT_SECRET
printf '\n'
export JWT_SECRET
docker compose up -d
unset JWT_SECRET
```

For hosted deployment, inject the exact existing value from the platform's encrypted secret manager as an environment variable. Never put it in `.env`, command-line arguments, build arguments, logs, or `docker compose config` output. Confirm the secret manager's injection mechanism preserves the value byte-for-byte before connecting to a database.

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
