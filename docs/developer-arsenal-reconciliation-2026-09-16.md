# Developer Arsenal Reconciliation — 16 September 2026

## Scope reviewed

An attached engineering brief identified three GitHub commits, including `a96a5d2` and `1775f68`, as a Developer Arsenal foundation. The synchronized working branch had independent NSOS history after the shared base commit, so the incoming work was reviewed file by file rather than merged wholesale.

## Reconciled foundation

The compatible engineering foundation has been incorporated as repository policy documents, the `pnpm arsenal:audit` static baseline check, CI baseline auditing, and security/performance workflow definitions. The performance workflow remains manual, requires an explicit boolean approval, and uses the existing staging-only target guard. It does not run automatically and does not default to production.

## Adjustments made

The incoming CodeQL v3 workflow was updated to v4, in line with GitHub’s current migration guidance. The incoming secret-scan action was updated to its Node 24-compatible v3 release. The incoming auto-opening Developer Arsenal launch overlay was not adopted because its static “live” claims could obscure an operator workspace and imply unverified remote outcomes.

## Explicit limits

The connected GitHub repository exposes registered CI, security, and performance workflows, but this reconciliation does not assert that any newly integrated workflow has run or passed. GitHub repository settings currently report Dependabot security updates and secret scanning as disabled. Backup, restoration, storage recovery, capacity, provider health, and remote workflow outcomes remain separate evidence gates. The package declares MIT but an owner-approved repository licence text is still absent.

## References

[1]: https://github.blog/changelog/2025-10-28-upcoming-deprecation-of-codeql-action-v3/ "GitHub: Upcoming deprecation of CodeQL Action v3"
[2]: https://github.com/github/codeql-action "GitHub CodeQL Action"
[3]: https://github.com/actions/dependency-review-action "GitHub Dependency Review Action"
[4]: https://github.com/gitleaks/gitleaks-action "Gitleaks GitHub Action"
