# NSOS Current State

**Status:** ACTIVE  
**Last verified against repository evidence:** 2026-10-01  
**Primary branch:** `main`  
**Coordination authority:** `docs/NSOS_OPERATING_PROTOCOL.md`

## Current product identity

NSOS (Nigerian School Operating System) is a Nigeria-first operating system for schools and learning institutions. The product thesis is a connected operations core spanning admissions, student/family operations, academics, finance, people operations, communications, public school presence, learning, and supervised AI assistance.

Primary positioning: **The operating system for education.**  
Brand line: **The Future Runs on NSOS.**  
Campaign marker: **#PoweredByNSOS**

## Current architecture principles

- Multi-tenant boundary is the school tenant (`schoolId`).
- Access is enforced server-side through membership/role checks.
- Object/file access is tenant-scoped.
- AI is approval-first: consequential actions require explicit human review.
- Provider boundaries are isolated from core business logic.
- Sensitive responses and audit events follow privacy/security controls already documented in the repository.

## Delivery/readiness state

The latest repository readiness evidence says NSOS is **conditionally ready for controlled private school use**, but not yet approved for broad real-school onboarding or a public 50K-user capacity claim.

Latest documented validation:
- 121 Vitest files
- 445 tests passing
- 2 intentional skips
- TypeScript validation passes
- lint passes
- production build passes
- formatting/diff checks pass

Latest documented managed checkpoint:
- `2709c9aa`
- associated commit: `2709c9a`

## Active P0 launch gate

**Issue #39 — Evidence-backed production launch gate:**  
https://github.com/Olori24/nsos-nigerian-school-operating-system-nigerian-school-operating-system/issues/39

Required evidence tracks:
1. Isolated synthetic staging with provider stubs.
2. Hosted request/error/latency/resource observability and actionable alerts.
3. Critical non-production smoke journeys for owner/admin, teacher/staff, guardian/student, and public admission.
4. Backup restore and migration/redeploy rollback rehearsal.
5. Progressive synthetic workload testing with p50/p95/p99 latency, error rate, DB/pool saturation, CPU/memory, and provider-stub latency.
6. Verified transactional sender domain and delivery evidence.

## Known blocker / unknowns

- Transactional email sender verification has been externally blocked by the configured `resend.dev` sender domain not being present in the connected Resend account.
- Backup/restore evidence: **UNKNOWN** until rehearsed.
- Hosted observability evidence: **PARTIAL/UNKNOWN** until telemetry and alert behavior are demonstrated.
- Critical end-to-end journey evidence: **INCOMPLETE** until executed against authorized non-production identities.
- 50K workload capacity: **UNKNOWN** until measured; the 50K model is a target workload, not a claim.
- Public paid academy launch: **BLOCKED** pending its separate launch evidence.

## Non-negotiable evidence boundary

Do not infer VERIFIED or DEPLOYED from this document. This file is a synchronization snapshot. Runtime evidence, test output, deployment records, and provider confirmations remain authoritative for their respective claims.

## Agent startup checklist

Before work:
- Read `docs/NSOS_OPERATING_PROTOCOL.md`.
- Inspect current `main`.
- Inspect Issue #39 and relevant open PRs.
- Search for existing implementations.
- Record the intended scope before changing code.

After work:
- Run the narrowest relevant tests, then required broader validation.
- Update the relevant issue/PR.
- Update this state file when a meaningful milestone changes.
- Leave blockers and unknowns explicit.
