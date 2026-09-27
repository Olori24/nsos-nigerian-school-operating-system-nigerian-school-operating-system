# NSOS production deployment workflow

The repository now contains `.github/workflows/production-deploy.yml`.

## Trigger behavior

- A deployment is eligible only after the `NSOS CI` workflow completes successfully for `main`.
- The workflow can also be run manually with GitHub Actions `workflow_dispatch` on `main`.
- Deployments use the `production` GitHub environment and cancel an older in-flight deployment for the same branch.
- The workflow passes the exact commit SHA that was validated by CI to the provider's deploy hook.

## Required configuration

Add this repository secret before enabling production deployments:

```text
PRODUCTION_DEPLOY_HOOK_URL
```

The value must be an authenticated HTTPS deployment hook supplied by the existing production hosting provider. Do not commit the URL, bearer token, API key, or other credentials to the repository.

The workflow intentionally fails closed when the secret is missing. This prevents a green GitHub push from being presented as a production deployment when the hosting provider has not been connected.

## Provider contract

The hook must accept an authenticated `POST` request with a JSON body containing:

- `repository`
- `commit`
- `ref` (`main`)
- `source` (`github-actions`)

The hook should return a successful HTTP status only after it accepts the deployment request. Provider-specific rollout completion and health checks remain the responsibility of the provider integration and should be added once that provider's documented API is available.
