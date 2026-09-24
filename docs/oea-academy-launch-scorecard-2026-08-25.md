# OEA Academy Launch Scorecard

**Date:** 2026-08-25  
**Scope:** NSOS Autonomous AI Academy mission  
**Overall verdict:** **BLOCKED for public paid launch.** The platform can now prepare and review a private academy foundation through authenticated owner/admin workflows, but a real public academy launch requires unresolved tenant, sender, merchant, publication, certificate, staging, recovery, and measured-capacity evidence.

> **Interpretation rule:** A PASS reflects only the named control or internal capability. It never means that an academy is publicly approved, that a payment can be collected, that an email will arrive, that a learner is enrolled, or that a credential may be issued.

## Scorecard

| Gate | Result | Evidence | Required action before public paid launch |
| --- | --- | --- | --- |
| Existing online-provider reference candidate | **WARNING** | An existing online-training tenant, OAE Online Academy, has a small private learning foundation. No owner selected it as the mission reference tenant. | Owner selects an existing tenant or creates a legitimate `online_training_provider` through the authenticated flow. |
| OEA Academy private blueprint | **PASS** | Institution Builder now includes an **OEA Academy** private-reference starter. It makes no people, finance, publication, credential, provider, or domain change. | Owner selects a tenant, prepares a blueprint, and independently reviews each handoff. |
| Private academy operating blueprint | **PASS** | The OEA blueprint defines identity direction, five programme directions, AI-role disclosures, policy readiness, and protected launch steps. | Confirm legitimate identity, policies, content rights, contacts, and operating model in the chosen tenant. |
| Course, curriculum, and learning-material preparation | **PASS — internal only** | Builder and Course Studio prepare reviewable programme/module/milestone/material drafts. File-to-School supports private TXT, Markdown, and bounded CSV sources with provenance. | Activate only approved programme records and complete human content/quality review. |
| Supervised AI tutoring | **PASS — supervised only** | Tutor scope, supervisor, daily question limits, escalation, and learner-owned support controls are in place. | Configure accountable staff and approved tutor scope in the selected tenant. |
| AI Tutor usage envelope | **PASS — non-monetary** | Owner/admin tutor workspace shows aggregate daily and rolling-30-day question/support-request volume. | Obtain provider-supported usage/cost data before calculating, billing, or claiming AI spend. |
| Academy Launch Readiness | **PASS — factual checklist** | School Operator computes a tenant-scoped configuration checklist for direction, learning, tutor, website/admissions, payment, sender, certificate policy, and staging evidence. | Resolve every BLOCKED item through its own protected workflow. |
| Public website and catalogue | **BLOCKED** | Unpublished website drafts and protected publication controls exist, but no owner-approved public academy content or selected reference tenant was validated. | Review public claims, contact details, admissions settings, content rights, and publish only with explicit owner approval. |
| Payment and payment-to-enrollment | **BLOCKED** | Provider readiness can be stored/tested, but no verified merchant configuration or end-to-end transaction-to-enrollment evidence exists for this mission. | Supply legitimate provider credentials, conduct controlled test validation, and separately verify the approved enrollment behavior. |
| Email and transactional support | **BLOCKED** | Full regression suite confirms the configured `resend.dev` sender domain is not verified in the connected Resend account. | Complete the approved verified-sender domain process; retain the integration test as the gate. |
| Certificate policy and public verification | **BLOCKED** | Private certificate-policy/record controls exist, but public verification and automatic issuance are intentionally absent. | Complete a separate consent, privacy, issuer-policy, and verification design before any public credential claim. |
| Autonomous admissions, finance, grading, or messages | **FAIL by design** | These operations are intentionally excluded from AI automation. | Keep accountable human review; do not attempt to remove the boundary. |
| Tenant isolation and private-file access | **PASS** | Private object downloads are record-aware and tenant/role authorized; admission review requires tenant scope; direct regressions cover cross-tenant access. | Continue regression coverage for every new object-bearing workflow. |
| Recovery, staging, and load evidence | **BLOCKED** | The probe is staging-only and fail-closed; no isolated synthetic target, restore rehearsal, or progressive-load measurement has been approved. | Provide isolated staging and execute the controlled runbook before any capacity statement. |
| Preview/mobile observation | **WARNING** | Production build passed. The temporary preview wake-up redirected to Manus sign-in and human verification; no protected workspace was accessed. | Re-run mobile and authenticated visual checks in an authorized session before a presentation or public launch. |

## Current software validation

| Validation | Result |
| --- | --- |
| Fresh TypeScript check | **PASS** |
| Focused academy, tutor, builder, and School Operator regressions | **PASS: 20 tests across 5 files** |
| Production build | **PASS**; existing main-bundle warning remains (`index` approximately 2.17 MB minified). |
| Full regression suite | **424/425 tests passed across 117/118 files**. The single failure is the unchanged external Resend verified-sender gate. |

## Immediate owner decision

The next safe action is not to “launch automatically.” The owner must choose either an existing institution or a new legitimate online-provider tenant, then approve one private OEA blueprint. After that, the Academy Launch Readiness panel gives a factual, tenant-specific path through learning, tutor, public-presence, payment, sender, private-certificate, and staging gates. No employee identities, learners, payments, testimonials, outcome claims, certificates, or public catalogue entries will be fabricated to make the dashboard appear complete.
