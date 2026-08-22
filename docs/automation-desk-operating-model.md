# NSOS Automation Desk Operating Model

**Status:** Product and engineering contract for the selected Option A one-tap in-app automation release.

## Purpose

The NSOS Automation Desk turns a school owner or administrator’s plain-language goal into a **short, visible, typed job**. It removes the need to hunt through many setup pages while retaining school control. The agent may prepare and execute only actions that the institution has reviewed and approved; it cannot infer missing real-world facts, bypass role permissions, or silently perform an external or consequential action.

> **Simple user journey:** Describe the goal → answer only missing school-approved questions → review a short plan → select **Approve and run** → see each result, block, or recovery step in one place.

## Job lifecycle

| State | Meaning | User-facing action |
|---|---|---|
| `needs_input` | The agent knows the goal but lacks real school-approved details. | Provide only the named missing fields. |
| `ready_for_review` | Inputs and the typed execution plan are valid. No data has been changed. | Review the concise plan. |
| `approved` | An authorised owner or administrator has approved the eligible job. | The job may be started once. |
| `running` | The server is completing allowlisted internal steps. | Show progress; prevent a duplicate run. |
| `completed` | The allowed work finished and durable result evidence exists. | Open the created draft or next review step. |
| `blocked` | A dependency or final approval is deliberately outside the job boundary. | Show one specific protected next step. |
| `failed` | An internal error prevented completion; no partial job outcome is presented as success. | Retry only when the job is safely retryable. |
| `cancelled` | The user intentionally stopped a job before execution. | Start a new job when ready. |

## First execution catalog

| Goal category | One-tap job can do | Remains a separate final approval |
|---|---|---|
| Academic foundation | Create the reviewed planning session, term, provided classes, and selected curriculum template. | Any later assessment, result approval, or publication. |
| Private online-school launch | From one full prompt, save one server-generated draft programme, modules, human-reviewed milestones, and internal materials, then return configuration-readiness evidence. | Programme/module/milestone activation, learner enrolment, tutor account creation, pricing, fee/payment configuration, publication, messaging, completion review, or credentials. |
| Course and learning materials | Direct the owner to the existing editable Course Studio for a dedicated course blueprint review. | Saving any course draft, programme/module/milestone activation, learner enrolment, tutor creation, completion review, or credentials. |
| School website | Prepare an editable private website configuration proposal when required facts are supplied. | Applying a website draft, public publication, domain connection, or DNS verification. |
| Staff setup | Prepare a private invitation draft from school-approved identity and role details. | Sending an email invitation or creating a linked account/profile. |
| Finance setup | Prepare an inactive fee-structure draft from school-approved fee details. | Activating fees, issuing invoices, collecting payment, refunds, bank changes, or payment-provider action. |

## Safety and privacy controls

Every automation job is scoped by `schoolId` and every server operation rechecks active membership and owner/admin role. The model receives only permitted readiness and configuration context. The original goal text is not written to audit metadata. Jobs are rate-limited, idempotent, and record safe counts, job state transitions, actor identity, permitted action type, and resulting draft references. They do not store secrets, raw provider credentials, payment data, message content, document bytes, or unnecessary personal information.

The following operations are explicitly outside first-release one-tap automation: public publication, external communication delivery, staff or learner account creation, invitation sending, fee activation, invoicing, payment collection, refunds, bank-account changes, provider credential changes, DNS changes, domain registration, result publication, automatic grading, completion confirmation, credential issuance, and credential claims. If a goal requires any of these, the job becomes `blocked` and links to the existing confirmation-gated workspace.

## Reliability rules

The runner executes a bounded server-side action catalog, never free-form model instructions. A job may only run from `approved`; repeated approval or retry requests reuse the same idempotency key and return the existing completed result where appropriate. A failed execution must either leave no durable effect or report the exact already-completed safe sub-step. The UI labels unavailable or blocked work honestly and never presents navigation as completed automation.

## Validation record — 22 August 2026

The Automation Desk release added and applied additive migration `0052_gray_ego.sql`. Focused route, UI, Concierge handoff, and retained setup-agent validation passed **20 tests across 5 files**, covering owner/admin scope, membership denial, prompt-free audit metadata, idempotent job creation, typed input validation, explicit approval, execution claiming, action allowlisting, unsupported-job refusal, no automatic retry after failure, activity visibility, and mobile-facing copy.

TypeScript and the production build passed. The managed NSOS shell rendered successfully at the desktop viewport. The full suite completed with **332 passing tests across 96 passing files**; the only failure remains the unrelated external sender authorization check because `resend.dev` is not verified in the connected Resend account. No sender, payment, DNS, domain, message-delivery, provider, publication, account, or credential action was taken during this release.

## Private Online School Launcher extension — 22 August 2026

The selected private Online School Launcher added and applied additive migration `0053_damp_nightcrawler.sql`, extending the Automation Desk job enum with `online_school_launch`. The server derives the institution operating type, asks the existing structured Course Studio service for a bounded internal blueprint, and persists only the existing transaction-backed programme, module, milestone, and material drafts after one owner/admin confirmation.

The configuration-readiness result is deliberately not fabricated test data. It verifies only the current tenant’s new draft programme structure and reports the created counts. It cannot create or activate learners, guardians, staff, reviews, testimonials, admissions, attendance, invoices, payments, receipts, messages, tutor accounts, credentials, public website content, domains, provider configuration, or public claims.

Focused private-launch, route, UI, and Course Studio regressions passed **9 tests across 3 files**. TypeScript and the production build passed. The full suite completed with **336 passing tests across 97 passing files**; the only failure remains the unchanged external Resend sender-domain authorization hold for `resend.dev`.
