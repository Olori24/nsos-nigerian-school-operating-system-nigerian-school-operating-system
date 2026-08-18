# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for a suspected security vulnerability or for information that could expose a school, student, guardian, staff member, provider credential, or production endpoint.

Use the repository’s **Security → Advisories → Report a vulnerability** flow to submit a private report. Include the affected component, reproduction steps, security impact, and any relevant request or response details after removing personal data and credentials.

The NSOS maintainers will acknowledge valid reports, investigate them privately, and coordinate a fix before public disclosure. Do not include real student data, guardian contact details, authentication tokens, provider credentials, or SMS content in a report.

## Supported baseline

The actively maintained `main` branch is the supported baseline. Production changes should pass the repository’s typecheck, test, and build workflow before merge.
