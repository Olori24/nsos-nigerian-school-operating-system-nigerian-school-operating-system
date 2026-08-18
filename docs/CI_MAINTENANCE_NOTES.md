# NSOS Continuous-Integration Maintenance Notes

## GitHub Actions setup-node failure — August 2026

The first NSOS CI run reached the **Set up Node.js** action, installed Node.js 22.23.2 from the hosted tool cache, and then failed with the following error:

> `Error: Unable to locate executable file: pnpm. Please verify either the file path exists or the file can be found within a directory specified by the PATH environment variable. Also check the file mode to verify the file is executable.`

The workflow did not explicitly set `cache: pnpm`. However, the repository's `package.json` declares pnpm in its `packageManager` field. `actions/setup-node` can therefore infer package-manager caching automatically and tries to execute pnpm during the Node setup step. The original workflow enabled Corepack only after that step, leaving pnpm unavailable at the time of the automatic cache lookup.

The repair keeps Node.js 22, enables Corepack before the locked pnpm install, and explicitly sets `package-manager-cache: false` on `actions/setup-node`. This prevents an inferred pnpm cache lookup before Corepack exposes the pnpm shim. The CI workflow continues to use `pnpm install --frozen-lockfile`, followed by the NSOS typecheck, test, and production-build gates.

For the current setup-node automatic caching behavior, see the official [advanced usage guidance](https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md).
