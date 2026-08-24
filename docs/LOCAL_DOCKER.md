# Local Docker deployment

NSOS can be started with Docker Compose using an isolated MySQL service and a production-mode Node runtime.

## Quick start

1. Copy `.env.example` to `.env` and replace the local secrets/URLs you intend to use.
2. Run `docker compose up --build`.
3. Open `http://localhost:3000`.

The Compose stack waits for MySQL health before starting the application. Local database state is persisted in the `nsos_mysql_data` volume.

## Services

- `mysql`: MySQL 8.4 with a dedicated `nsos` database and non-root application user.
- `app`: Node 22 production bundle built from the repository Dockerfile.

The image uses the repository's locked pnpm dependency graph. Client build-time variables are supplied through Docker build arguments.

## Production warning

This Compose file is a local/self-hosted development and evaluation path. Replace all example secrets, configure a real TLS-terminated deployment, use managed secret storage, and do not expose the bundled MySQL credentials to the public internet.
