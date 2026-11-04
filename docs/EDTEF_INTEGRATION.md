# EDTEF school-directory integration

NSOS exposes a read-only, server-side proxy for the EDTEF public school directory. The browser never receives the EDTEF API key.

## Secret configuration

Set `EDTEF_API_KEY` in the managed runtime's encrypted environment-variable/secret manager. Never add the value to source control, Vite-prefixed variables, client configuration, logs, issue comments, or browser requests. The integration is optional: if the secret is absent, the endpoints return HTTP 503 and NSOS continues to start normally.

## Internal endpoints

- `GET /api/edtef/states`
- `GET /api/edtef/schools?state=kwara&ownership=state&page=1&per_page=20`
- `GET /api/edtef/schools/:id`

Supported list filters: `state`, `lga`, `ownership`, `gender`, `boarding`, `page`, and `per_page`. This proxy is read-only; it does not import EDTEF records into a school's private tenant database and does not expose CSV bulk export.

Successful responses include attribution: “EDTEF school directory (edtef.org)” linked to `https://edtef.org`. Successful upstream JSON responses are cached in-process for 15 minutes, with a 500-entry bound. Requests time out after 8 seconds. Upstream 429 responses are passed through with a safe message and any Retry-After header. Other provider errors and diagnostics are not exposed to clients.

## Activation and verification

1. Obtain the key through EDTEF's email verification flow.
2. Add it to the production runtime as `EDTEF_API_KEY`.
3. Restart/redeploy the managed application through its normal release process.
4. Call `/api/edtef/states` and a filtered `/api/edtef/schools` request. Confirm 200 responses, expected records, attribution, and that the key is absent from browser assets and logs.
5. If no key is configured, confirm 503 responses without exposing configuration details.

The current hosting provider's secret manager must be confirmed from the active deployment account before making any provider-side configuration change.
