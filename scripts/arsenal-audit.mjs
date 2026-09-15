import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const required = [
  "package.json",
  "pnpm-lock.yaml",
  ".env.example",
  "SECURITY.md",
  ".github/dependabot.yml",
  ".github/workflows/ci.yml",
  ".github/workflows/security.yml",
  "docs/DEVELOPER_ARSENAL.md",
  "docs/AI_ENGINEERING_STANDARD.md",
  "docs/PROVIDER_ADAPTER_STANDARD.md",
];

const missing = required.filter(path => !existsSync(join(root, path)));
if (missing.length) {
  console.error(`Developer Arsenal audit failed. Missing: ${missing.join(", ")}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const errors = [];
if (!pkg.packageManager?.startsWith("pnpm@")) errors.push("packageManager must pin pnpm");
if (pkg.license !== "MIT") errors.push("package license must remain explicitly declared");
if (!pkg.scripts?.check || !pkg.scripts?.test || !pkg.scripts?.build) {
  errors.push("check, test and build scripts are required");
}

const rootEntries = readdirSync(root, { withFileTypes: true }).map(entry => entry.name);
const trackedEnvLike = rootEntries.filter(name => /^\.env(\.|$)/.test(name) && name !== ".env.example");
if (trackedEnvLike.length) errors.push(`unexpected environment files at repository root: ${trackedEnvLike.join(", ")}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "PASS",
  checks: required.length + 4,
  packageManager: pkg.packageManager,
  license: pkg.license,
  message: "NSOS developer arsenal baseline is present and pinned.",
}, null, 2));
