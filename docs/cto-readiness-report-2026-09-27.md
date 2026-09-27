# NSOS CTO Readiness Report

**Date:** 27 September 2026
**Scope:** Current NSOS source, regression coverage, managed deployment, public entry surface, and the School Success Loop release.

## Executive verdict

NSOS is **conditionally ready for controlled private school use**. It is **not approved for broad real-school onboarding, a 50,000-user capacity claim, or a public paid academy launch**.

The current release has a passing application validation baseline, tenant-scoped School Operator intelligence, protected review-first handoffs, responsive mobile controls, and a clean public brand surface. The remaining launch decision depends on evidence that cannot be created by source changes alone: isolated staging, synthetic-data recovery rehearsal, hosted observability, provider delivery verification, and end-to-end journeys using authorized test identities.

> **Evidence rule:** A passing test proves the named control. It does not prove provider delivery, production capacity, backup recovery, or a successful customer journey unless that behavior was directly exercised in an authorized environment.

## Current release evidence

The existing NSOS project is synchronized to GitHub main at commit `2709c9a`. The managed checkpoint is `2709c9aa`. The release includes the evidence-first School Success Loop in the protected School Operator workspace. It does not create a new project, change the hosting platform, or add autonomous consequential actions.

The final validation run passed **121 Vitest files with 445 tests passing and 2 intentional skips**. TypeScript, lint, production build, Prettier checks, and `git diff --check` also passed. The build continues to report a large main client chunk; this remains a delivery-optimization risk rather than a functional failure.

The supplied mobile screenshots identified a concrete usability defect. The global theme control was wide, fixed, and visually covered both the document-assist panel and command-centre content. It is now compact and icon-only at phone widths, respects the safe-area inset, sits below higher-priority install and document overlays, and retains a labelled control on larger screens. The installed-app shell cache was advanced from `v3` to `v4` so stale clients can replace the old bundle.

The floating assistant is visibly branded **NSOS Guide**. A final production-bundle inspection found `NSOS Guide` and `Open NSOS Guide` markers and no stale visible `Institution Copilot`, `Open NSOS Institution Copilot`, or `Copilot` labels. Internal implementation names remain unchanged because they are not user-facing branding.

## Journey scorecard

| Journey or control | Verdict | Evidence and limitation |
| --- | --- | --- |
| Owner and administrator School Operator | **PASS — source and regression evidence** | School Operator route and UI tests pass. The School Success Loop is tenant-scoped and uses protected handoffs. A full fresh-identity production journey was not run. |
| Teacher and staff access boundaries | **PASS — route and policy evidence** | Role-specific route and policy regressions pass. No claim is made about a newly provisioned teacher account in production. |
| Guardian and student portal boundaries | **PASS — route and visibility evidence** | Portal, family finance, announcement, invitation, and visibility regressions pass. No new guardian or learner identity was created during this release. |
| Public admission surface | **PASS — route and validation evidence** | Public-admission route and form regressions pass. No real applicant submission or document upload was performed. |
| Passwordless email and invitation delivery | **BLOCKED externally** | Application safeguards and durable failure states are implemented, but actual delivery remains dependent on verified sender configuration and provider acceptance. No invitation or test message was sent in this release. |
| Resend domain status | **MEASURED separately** | The existing sender-domain handoff and read-only domain checks remain the provider gate. This report does not treat API reachability as proof of inbox delivery. |
| Production observability and alerting | **PARTIAL / UNKNOWN** | Correlation-safe request events and startup checks exist in source. Hosted retention, dashboards, alert routing, resource telemetry, and incident drill evidence remain unverified. |
| Backup, restore, and rollback | **UNKNOWN** | The runbook and acceptance criteria exist. No isolated restore rehearsal or measured recovery time was executed. |
| 50K registered-user capacity | **UNKNOWN** | No production-like synthetic staging benchmark exists. The existing health checks are not an authenticated school-operations workload. |
| Public paid academy launch | **BLOCKED** | Tenant selection, public content approval, merchant evidence, sender delivery, certificate policy, staging, and capacity gates remain separate requirements. |

## Security and data boundary

No production learner, guardian, financial, invitation, payment, certificate, grade, message, or provider record was created or changed during this release. The read-only database check observed four school website records, two published websites, zero active custom domains, and zero pending custom domains.

The School Success Loop is deliberately informational and review-first. It can route an authorized operator to an existing protected workspace, but it does not approve fees, send messages, publish websites, enroll learners, issue credentials, or create staff identities from a prompt.

## Required next gates

The next engineering gate is an isolated staging environment with synthetic schools, memberships, learners, guardians, invoices, documents, provider stubs, request correlation, retained latency and error measurements, and a tested abort path. The workload sequence must begin with smoke validation and progress only when authorization, tenant isolation, error rates, database behavior, and provider stubs meet the pre-agreed stop conditions.

The next operational gate is a recovery rehearsal against that disposable staging dataset. The evidence must record restoration behavior, migration rollback or redeploy behavior, observed recovery time, and corrective actions. It must not use production records or live provider effects.

The next customer-journey gate is a controlled run using authorized non-production identities. It should cover owner or administrator setup, teacher or staff access, guardian and student portal reads, public admission validation, and safe failure paths. Provider delivery should use a non-production or stubbed sender. Until this is completed, the overall verdict remains conditional.

## Release decision

**Release the current code to the existing managed NSOS project for controlled private use and review. Do not describe the platform as 50K-capable, fully recovered, fully observable, or broadly launch-ready.** Keep the remaining readiness items open until their evidence is independently produced.

## References

[1]: https://nsos.top/ "NSOS production root"
[2]: https://github.com/Olori24/nsos-nigerian-school-operating-system-nigerian-school-operating-system "NSOS GitHub repository"
