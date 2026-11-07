# NSOS Portable Container Deployment

**Status:** Configuration added; container build, startup, staging, and production deployment remain unverified until the Docker smoke workflow and an isolated operator-controlled environment pass.

## Purpose

The Dockerfile packages the existing React/Vite client and Express/tRPC server as one Node.js service. Docker Compose is a portable single-service runtime definition. It does not replace the managed Manus deployment, migrate data, create infrastructure, or change DNS.

## Build and run

1. Install Docker Engine and the Docker Compose plugin on the target host.
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
curl --fail --silent http://127.0.0.1:3000/healthz
```

The endpoint proves only that the HTTP process is running. It does not prove database connectivity, authentication, tenant isolation, provider delivery, or production readiness.

## Secret continuity and encrypted data

**Do not generate a new JWT_SECRET and point the container at the existing production database.**

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
| Image build | Docker build workflow passes on this branch | Pending |
| Process smoke | Container starts with synthetic runtime configuration and `/healthz` returns 200 | Pending |
| Isolated staging | Dedicated DB, storage namespace, secrets, OAuth and provider stubs verified | Blocked until provisioned |
| Authentication | Synthetic user sign-in/session lifecycle passes | Not run |
| Tenant isolation | Cross-tenant and role boundary tests pass against staging | Not run |
| Recovery | Staging backup restore and rollback rehearsal recorded | Not run |
| Production | Owner-approved cutover plan and verified rollback | Not authorized |

A successful image build or `/healthz` response must not be represented as a successful staging deployment or production release.
