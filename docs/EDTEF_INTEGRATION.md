# EDTEF school-directory integration

NSOS exposes a read-only, server-side proxy for the EDTEF public school directory. The browser never receives the EDTEF API key.

## Secret configuration

Set `EDTEF_API_KEY` in the managed runtime's encrypted environment-variable/secret manager. Never add the value to source control, Vite-prefixed variables, client configuration, logs, issue comments, or browser requests. The integration is optional: if the secret is absent, the endpoints return HTTP 503 and NSOS continues to start normally.

## Internal endpoints

- `GET /api/edtef/states`
- `GET /api/edtef/schools?state=kwara&ownership=state&page=1&limit=20`
- `GET /api/edtef/schools/:id`

Supported list filters: `state`, `lga`, `ownership`, `gender`, `boarding`, `q`, `page`, and `limit` (maximum 200). School IDs use EDTEF's `sch_` plus 12 lowercase hexadecimal characters format. This proxy is read-only; it does not import EDTEF records into a school's private tenant database and does not expose CSV bulk export.

Successful responses include attribution: “EDTEF school directory (edtef.org)” linked to `https://edtef.org`. Successful upstream JSON responses are cached in-process for 15 minutes, with a 500-entry bound. Cache misses consume two shared, database-backed budgets across all application instances and callers: a conservative five-request allowance per aligned second (which keeps the maximum within any rolling one-second interval at or below EDTEF’s published 10-request/second limit), and 8,000 upstream requests per 24-hour window. This intentionally reserves at least 2,000 requests/day against the published free-plan allowance of 10,000/day for operational headroom and any other consumers of the same key. If the shared budget store is unavailable, the integration fails closed with HTTP 503. Requests time out after 8 seconds and redirects are rejected so the credentialed `x-api-key` header cannot be forwarded to another host. Upstream 429 responses are passed through with a safe message and any Retry-After header. Other provider errors and diagnostics are not exposed to clients.

## Activation and verification

1. Obtain the key through EDTEF's email verification flow.
2. Add it to the production runtime as `EDTEF_API_KEY`.
3. Restart/redeploy the managed application through its normal release process.
4. Call `/api/edtef/states` and a filtered `/api/edtef/schools` request. Confirm 200 responses, expected records, attribution, and that the key is absent from browser assets and logs.
5. If no key is configured, confirm 503 responses without exposing configuration details.

NSOS is documented as running on the managed Autoscale profile. Add the secret through that deployment's managed secret workflow. This change does not alter hosting, domain routing, or any existing environment variables.
