import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const required = [
  "package.json",
  "pnpm-lock.yaml",
  "SECURITY.md",
  ".github/dependabot.yml",
  ".github/workflows/ci.yml",
  ".github/workflows/security.yml",
  ".github/workflows/performance.yml",
  "docs/DEVELOPER_ARSENAL.md",
  "docs/AI_ENGINEERING_STANDARD.md",
  "docs/AUTOMATION_ENGINEERING_STANDARD.md",
  "docs/CLIENT_DELIVERY_STANDARD.md",
  "docs/PROVIDER_ADAPTER_STANDARD.md",
  "docs/RECOVERY_RUNBOOK.md",
];

const missing = required.filter(path => !existsSync(join(root, path)));
const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8")
);
const errors = [];

if (missing.length)
  errors.push(
    `Missing required Developer Arsenal artifacts: ${missing.join(", ")}`
  );
if (!packageJson.packageManager?.startsWith("pnpm@"))
  errors.push("packageManager must pin pnpm");
if (!packageJson.license || packageJson.license === "UNLICENSED")
  errors.push("package.json must declare an explicit license policy");
for (const script of ["arsenal:audit", "check", "lint", "test", "build"]) {
  if (!packageJson.scripts?.[script])
    errors.push(`Missing required package script: ${script}`);
}

const rootEntries = readdirSync(root, { withFileTypes: true }).map(
  entry => entry.name
);
const environmentFiles = rootEntries.filter(
  name => /^\.env(?:\.|$)/.test(name) && name !== ".env.example"
);
if (environmentFiles.length)
  errors.push(
    `Unexpected root environment files: ${environmentFiles.join(", ")}`
  );

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      checks: required.length + 4,
      packageManager: packageJson.packageManager,
      license: packageJson.license,
      message:
        "NSOS Developer Arsenal baseline artifacts are present. Operational evidence remains separately verified.",
    },
    null,
    2
  )
);
