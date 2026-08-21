# Copilot Setup Agent Validation — 21 August 2026

## Purpose

This controlled validation verifies the **supervised academic-foundation path** of the NSOS Copilot setup agent without creating synthetic learners, staff, financial records, or public content in a live school tenant.

## Exercised path

| Control | Expected result | Evidence |
| --- | --- | --- |
| Tenant readiness assessment | Only active owners or administrators may obtain readiness and the permitted setup plan. | `nsos.setup-agent-routes.test.ts` rejects a teacher and permits an owner. |
| School-approved inputs | The agent accepts a session, term, dates, real class names, and a reviewed Nigerian curriculum template. | Route contract validates bounded input and required fields. |
| Explicit approval | Execution is impossible without `confirmed: true`. | Route test confirms the false value is rejected. |
| Executed configuration contract | A confirmed run sends the exact tenant ID, actor ID, real class names, and template ID to the setup service. | Route test asserts the service call payload. |
| Persisted outcomes in production code | The service idempotently reuses matching session, term, and class names; otherwise it creates planning session, term, and class records before applying the reviewed curriculum template. | `runCopilotSetupAgentAcademicFoundation()` implementation and type-checked production build. |
| Audit history | Successful executions create a tenant-scoped `copilot_setup_agent_academic_foundation_applied` security event visible in the Copilot panel. | Service and interface regression tests. |
| Sensitive-data boundary | Staff, learners, bank accounts, provider credentials, and public content are never auto-created. | Setup assessment provides an explicit handoff to the relevant workspace. |

## Results

The targeted setup-agent suite passed, including owner/admin access control, mandatory confirmation, payload forwarding, role-boundary enforcement, and user-interface safeguards. The complete NSOS suite subsequently passed with **63 test files and 220 tests**, together with TypeScript validation and the production build.

> No live school records were inserted for this controlled validation. A production school owner can use the agent only after entering and confirming the school’s own approved session, term, class, and curriculum details.
