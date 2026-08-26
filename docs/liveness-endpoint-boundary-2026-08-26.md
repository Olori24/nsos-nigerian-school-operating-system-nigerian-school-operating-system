# NSOS Liveness Endpoint Boundary — 26 August 2026

## Endpoint

`GET /healthz` is an unauthenticated, cache-disabled liveness signal for deployment and platform probes. It returns only an `ok` status, the fixed service label `nsos`, and a UTC timestamp. It intentionally does not read the database, storage, provider configuration, tenant records, user identity, environment values, build metadata, or infrastructure topology.

## Operational meaning

A successful `200` response means that the NSOS HTTP process can accept and respond to a request. It does **not** prove database connectivity, migration state, storage accessibility, provider delivery, tenant authorization, recovery readiness, backup integrity, capacity, or end-user workflow health. Those require their own controlled evidence.

## Use

The endpoint is suitable for a managed platform’s liveness probe or a separately approved staging smoke probe. It is emitted through the existing correlation-safe request logging middleware and is served with `Cache-Control: no-store`. It must not become a place to expose diagnostic details or credentials.
