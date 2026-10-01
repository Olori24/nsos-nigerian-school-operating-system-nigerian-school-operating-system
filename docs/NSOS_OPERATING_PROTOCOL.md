# NSOS Operating Protocol

**Status:** ACTIVE  
**Version:** 1.0  
**Last updated:** 2026-10-01  
**Source of truth:** This repository, especially `main`, merged pull requests, issues, tests, and evidence-linked readiness documents.

## 1. Authority and truth

1. The Founder is the final authority for product, business, security, production, and irreversible external decisions.
2. GitHub is the shared source of truth for implementation and delivery state.
3. Merged code and reproducible evidence outrank private chat memory.
4. Open PRs/issues are proposed or in-progress work, not completed work.
5. A claim is not considered verified merely because an agent says it is done.

**Evidence hierarchy:** observed production behavior > reproducible test/evidence > merged implementation > documented plan > agent/private-chat assertion.

## 2. Agent roles

- **Founder:** priorities, approvals, business/product decisions, production-impacting authorization.
- **Primary ChatGPT session:** product + technical coordination, architecture, execution, evidence discipline, and cross-agent synchronization.
- **Other ChatGPT sessions:** parallel research, architecture, implementation, and review work within explicitly documented scope.
- **Manus:** agentic implementation/testing/deployment work within an assigned scope.
- **GitHub:** shared memory and handoff surface for all agents.

No agent owns the whole project. No agent should assume another agent's private context.

## 3. Mandatory startup procedure

Before changing code, every agent must:

1. Read this file.
2. Read `docs/NSOS_CURRENT_STATE.md`.
3. Inspect the current `main` commit.
4. Inspect relevant open issues and PRs.
5. Read `todo.md` and applicable readiness/architecture/decision documents.
6. Search for existing implementations before creating new ones.
7. Identify whether the intended work is already implemented, tested, verified, deployed, blocked, or unknown.

If evidence conflicts, stop and document the conflict before making consequential changes.

## 4. Standard state vocabulary

Use these states exactly:

- **PROPOSED** — idea or intended work; not implemented.
- **IN PROGRESS** — actively being changed.
- **IMPLEMENTED** — code/config/docs exist.
- **TESTED** — automated or explicit test evidence exists.
- **VERIFIED** — acceptance evidence confirms the stated behavior.
- **DEPLOYED** — released to the stated environment.
- **BLOCKED** — a named dependency prevents completion.
- **UNKNOWN** — evidence is missing; do not infer success.
- **DEPRECATED** — intentionally superseded.

Do not collapse these states into “done.”

## 5. Change protocol

- One primary objective per issue/PR.
- Do not silently expand scope.
- Do not overwrite, revert, or reset another agent's work without inspection and a documented reason.
- Preserve tenant isolation, server-side authorization, auditability, privacy controls, and approval-first AI boundaries.
- Consequential production changes require explicit Founder authorization.
- Do not change DNS, payment providers, transactional email configuration, credentials, production data, or production infrastructure merely because another agent suggested it.
- Prefer small, reviewable commits and evidence-linked PRs for substantive code changes.

## 6. Evidence rules

- Documentation describes intent/state; it is not runtime proof by itself.
- A passing unit test proves only the behavior covered by that test.
- Provider/API reachability is not proof of successful delivery.
- A configured sender is not a verified sender.
- A capacity model is not a capacity result.
- Never claim the 50K workload target is achieved until an isolated synthetic test produces measured p50/p95/p99 latency, error rate, resource/DB-pool evidence, and provider-stub latency evidence.
- Never use real learner/family/finance records for load or recovery exercises.
- Never claim backup/restore, observability, or end-to-end journey readiness without linked evidence.

## 7. Handoff protocol

Every completed work unit must leave enough information for the next agent to continue without private context:

**Status:** one standard state  
**Scope:** what changed / what did not change  
**Files:** paths changed  
**Tests:** exact commands/results  
**Evidence:** links, commit SHA, issue/PR, environment where applicable  
**Blockers:** named dependency or external condition  
**Next action:** one concrete next step  
**Do not infer:** important unresolved assumptions

Update the relevant issue and `docs/NSOS_CURRENT_STATE.md` at meaningful milestones.

## 8. Conflict resolution

When two agents disagree:

1. Inspect `main`, merged PRs, issues, and current evidence.
2. Prefer the already-approved architecture unless new evidence disproves it.
3. Do not resolve product/business/security conflicts by guessing.
4. Record the conflict in GitHub.
5. Escalate unresolved Founder-level decisions to the Founder.

## 9. Prohibited delivery behavior

Agents must not:

- invent customers, revenue, uptime, capacity, security certifications, deployments, or adoption;
- mark work VERIFIED or DEPLOYED without evidence;
- treat roadmap text as implemented functionality;
- bypass approval gates for AI actions with financial, public, identity, academic, or irreversible consequences;
- introduce production side effects during synthetic testing;
- hide blockers because they make a milestone look incomplete.

## 10. Standard agent handoff block

Use this structure in issue/PR updates:

> **NSOS Handoff**
> - Status:
> - Scope:
> - Files:
> - Tests:
> - Evidence:
> - Blockers:
> - Next action:
> - Do not infer:

This protocol is the coordination contract for every ChatGPT session, Manus run, and human contributor working on NSOS.
