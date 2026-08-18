# NSOS AI Employees and Cash Assurance Specification

**Status:** Product and engineering specification. This document defines the next implementation cycle; it does not represent an enabled autonomous service or a substitute for school staff.

## 1. Product Thesis

NSOS should let a school employ **supervised AI employees** to reduce repetitive work, prepare decisions, and deliver approved learning support. Each AI employee must be tenant-scoped, role-limited, budgeted, auditable, and subject to named human ownership.

> **AI employees prepare, explain, monitor, and escalate. Authorised school staff approve decisions, control money, communicate consequential outcomes, and remain accountable to learners and families.**

The first commercial use case is **Cash Assurance**: helping finance teams see what is owed, reconcile payment evidence, manage follow-up, and surface exceptions without permitting AI to alter the financial ledger or contact families without an approved policy.

## 2. AI Employee Catalogue

| AI employee | School outcome | Permitted work | Human control required | Never permitted |
| --- | --- | --- | --- | --- |
| **Admissions Coordinator** | Fewer stalled applications and clearer follow-up. | Summarise authorised applications, identify missing fields/documents, draft follow-up tasks, prepare reviewer queue notes. | Admissions staff approve requests, decisions, and any external message. | Admit/reject an applicant, alter documents, or infer sensitive eligibility. |
| **Cash Assurance Officer** | Clear balances, focused follow-up, fewer unreviewed payment exceptions. | Prioritise collection cases, draft reminder copy from approved templates, classify a payment exception for review, prepare an owner brief. | Finance staff approve case changes, payment allocation, credits, write-offs, promises, and messages. | Change an invoice, receipt, balance, allocation, credit, write-off, or payment status. |
| **Parent Communication Assistant** | Faster, consistent school updates. | Draft announcements, convert approved content to supported channels, flag failed delivery, prepare parent-response summaries. | Owner/admin approves templates, recipients, escalations, and any non-template external message. | Send unapproved high-impact messages, expose one family’s data to another, or make welfare/discipline decisions. |
| **Operations Briefing Analyst** | Owner sees exceptions early. | Generate a concise daily brief from authorised aggregate/role-visible data: high-value balances, attendance anomalies, pending admissions, delivery failures, and unresolved tasks. | Owner controls thresholds and receives a reviewable source trail. | Access data outside its school or take corrective action. |
| **Course and Subject Tutor** | Extra explanation and practice for a teacher-approved course or subject. | Explain teacher-approved material, give practice questions, provide formative feedback, adapt examples to a chosen age/level, and flag repeated misconceptions. | A named teacher approves each course pack, age band, content source, instructions, publishing status, and escalation path. | Replace classroom supervision, issue final grades, make promotion/discipline decisions, offer medical/mental-health advice, or use unrestricted internet content with learners. |

### 2.1 Course and Subject Tutor Guardrails

The tutor is a **teacher-supervised learning assistant**, not a teacher replacement. Each tutor must operate within a school-defined course pack containing the subject, level, objectives, approved source materials, permitted assessment style, language, and age band.

The first release should limit tutors to on-demand learning support inside authenticated student/guardian views. It should not initiate private off-platform chats, create an unapproved curriculum, or access full learner records. Teaching staff receive an insight queue containing aggregate misunderstandings and safety/content flags, not a hidden “AI grade.”

| Capability | Initial release rule |
| --- | --- |
| Lesson explanation | Use teacher-approved curriculum and source materials only. |
| Practice | Generate formative practice with a visible “practice, not final assessment” label. |
| Feedback | Explain errors and suggest a next learning action; never publish a final grade. |
| Escalation | Encourage the learner to ask their teacher/guardian for help where content is unclear or sensitive. |
| Content safety | Block unsafe, sexual, violent, discriminatory, self-harm, medical, legal, or financial instruction outside the approved learning context; record a limited safety event for staff review. |
| Privacy | Send the minimum learning context necessary; do not include unrelated family, finance, health, or discipline data in prompts. |

## 3. AI Employee Operating Model

### 3.1 Ownership and Permission Model

Each AI employee belongs to exactly one `schoolId`. A named owner/admin configures it, a named human supervisor approves consequential actions, and the employee receives only the tools required for its role.

| Control | Requirement |
| --- | --- |
| Tenant boundary | Every employee, job, run, knowledge source, approval, and usage record includes `schoolId`; server procedures enforce membership and role checks. |
| Tool allowlist | An employee may call only its explicitly assigned, server-side tools. Tools return tenant-scoped and role-filtered data. |
| Approval policy | Policies classify actions as **read-only**, **draft**, **approval required**, or **blocked**. Money, admissions, results, discipline, and external communications default to approval required or blocked. |
| Audit trail | Record configuration changes, job request, input reference, tool calls, output, approval/rejection, execution result, model metadata, cost/usage, and failure state. Do not persist full sensitive prompt content unless explicitly required and retention-approved. |
| Budget | Each school has daily/monthly usage caps, per-employee limits, alert thresholds, and a manual disable control. |
| Kill switch | Owner/admin can pause an individual employee immediately; platform operator can disable a misbehaving employee type globally. |
| Knowledge controls | Course and policy sources are uploaded/approved by authorised staff, versioned, scoped to the employee, and revocable. |

### 3.2 First-Release Architecture Choice

Two approaches are viable. The recommended implementation is the lighter, safer first option; it creates a practical AI-employee experience without allowing unattended decision-making.

| Approach | How it works | Trade-offs | Cost | Setup complexity |
| --- | --- | --- | --- |
| **Supervised assistant jobs — recommended first** | A staff member starts a task or a scheduled internal brief creates a review item. The employee reads approved data, produces a structured draft, and waits for approval before any consequential action. | Less “autonomous” than a fully proactive agent, but easier to secure, audit, price, and explain to schools. | Controlled by per-job and monthly usage limits. | Moderate. |
| **Proactive managed employees — later** | Policy-driven background jobs detect events, create tasks, draft communications, and queue approvals without a staff member starting every task. | Higher operational complexity; requires stronger job reliability, observability, rate controls, consent rules, and escalation design. | Usage grows with event volume and monitoring cadence. | High. |

The implementation must discover the live server-side model catalogue at build time and select models by task type, quality target, and budget. AI calls must remain server-side; client applications never receive the provider key.

### 3.3 Core Data Model

| Table | Purpose | Key fields |
| --- | --- | --- |
| `aiEmployees` | Tenant-scoped employee configuration. | `id`, `schoolId`, `type`, `name`, `status`, `supervisorUserId`, `approvalPolicy`, `modelPolicy`, `monthlyBudget`, timestamps. |
| `aiEmployeeCapabilities` | Tool and action allowlist per employee. | `employeeId`, `capability`, `actionClass`, `enabled`. |
| `aiKnowledgeSources` | Approved, versioned instructional/policy source metadata. | `schoolId`, `employeeId`, `title`, `sourceType`, `storageKey`, `version`, `approvedBy`, `status`. |
| `aiJobs` | Requested or policy-triggered work. | `schoolId`, `employeeId`, `kind`, `subjectType`, `subjectId`, `status`, `requestedBy`, `idempotencyKey`. |
| `aiRuns` | One model execution and its bounded output metadata. | `jobId`, `model`, `inputReference`, `outputReference`, `status`, `usage`, `failureCode`. |
| `aiApprovals` | Human review of any approval-required output. | `schoolId`, `jobId`, `proposedAction`, `status`, `reviewedBy`, `reviewNote`, timestamps. |
| `aiSafetyEvents` | Limited, privacy-aware safety or policy flags. | `schoolId`, `employeeId`, `jobId`, `category`, `severity`, `resolutionStatus`, `reviewedBy`. |
| `aiUsageLedger` | Daily/monthly budget and cost observability. | `schoolId`, `employeeId`, `runId`, `inputTokens`, `outputTokens`, `estimatedCost`, date. |

Use object storage for approved course files or retained output artefacts. Persist metadata and references in the database; do not store file bytes in database tables.

## 4. Cash Assurance Module

### 4.1 Objective

Cash Assurance makes the school’s finance position actionable. It should answer, accurately and with a source trail:

1. What amount is due, paid, pending confirmation, disputed, or overdue?
2. Which guardian account needs staff attention next, and why?
3. Which payment evidence or provider event requires review before the ledger changes?
4. Which follow-up has been approved, sent, delivered, failed, deferred, or resolved?
5. What requires the owner’s decision today?

Cash Assurance is **not** a debt-collection robot. It must not autonomously alter financial records, threaten families, send unapproved communications, or restrict a learner’s educational access.

### 4.2 Scope and Non-Goals

| In scope | Out of scope for first release |
| --- | --- |
| Balance visibility, collection cases, payment-evidence review, reminder policies, promise-to-pay recording, disputes, assignment, escalation, audit, and owner brief. | Automated debiting, lending/credit scoring, legal collection, automatic write-offs, automated denial of school services, or AI-led payment allocation. |
| Provider payment events and manual evidence are reconciled through staff-reviewed rules. | Treating a provider submission as a settled payment without verified event or authorised finance review. |
| AI produces prioritisation and drafts under policy; staff approve execution. | AI issuing receipts, changing invoice totals, marking payments settled, or communicating coercively. |

### 4.3 Financial Source of Truth

Existing NSOS finance entities remain the ledger source of truth: fee structures, invoices, invoice lines, payments, receipts, balances, and finance reports. Cash Assurance adds **operational collection state** around those records; it does not create a second ledger.

| Concept | Definition |
| --- | --- |
| Invoice amount | Sum of approved invoice lines less recorded approved credits, following existing finance rules. |
| Amount paid | Sum of validated payment allocations applied to the invoice. |
| Outstanding balance | Invoice amount less amount paid and approved credits. It must never become negative through a Cash Assurance action. |
| Payment under review | Evidence or provider event received but not yet accepted into the validated payment/allocation workflow. |
| Collection case | An operational case connected to a guardian/student account and one or more invoices; it tracks follow-up, promises, disputes, assignment, and resolution. |
| Promise to pay | A guardian-reported proposed amount/date. It is informational until a verified payment is recorded. |
| Dispute | A finance-reviewed claim that temporarily pauses selected reminder actions without changing the underlying ledger until an authorised adjustment occurs. |

### 4.4 Data Model Additions

| Table | Purpose | Key fields and integrity rules |
| --- | --- | --- |
| `cashAssuranceCases` | Operational collection case for an account/invoice group. | `schoolId`, `guardianId`, optional `studentId`, `status`, `priority`, `assignedTo`, `nextActionAt`, `pausedReason`, `openedBy`, timestamps. Enforce one active case per configured case scope. |
| `cashAssuranceCaseInvoices` | Links a case to invoices without duplicating financial amounts. | `caseId`, `invoiceId`, `snapshotOutstandingAmount`, `includedAt`. Recalculate dashboard values from source finance records. |
| `cashAssuranceEvents` | Append-only timeline for case activity. | `schoolId`, `caseId`, `type`, `actorType`, `actorUserId`, `messageLogId`, `paymentId`, `note`, timestamp. |
| `paymentEvidence` | Metadata for a supplied receipt/image or provider reference awaiting review. | `schoolId`, `guardianId`, `storageKey`, `providerReference`, `amountClaimed`, `status`, `reviewedBy`, `paymentId`, timestamps. File bytes remain in storage. |
| `paymentAllocations` | Explicit, auditable allocation from a validated payment to an invoice. | `schoolId`, `paymentId`, `invoiceId`, `amount`, `allocatedBy`, timestamp. Sum may not exceed payment amount or invoice outstanding balance. |
| `reminderPolicies` | School-defined reminder cadence and approved templates. | `schoolId`, `name`, `triggerRule`, `channel`, `templateId`, `requiresApproval`, `quietHours`, `enabled`. |
| `reminderRuns` | Individual proposed/approved/sent reminder execution. | `schoolId`, `caseId`, `policyId`, `messageLogId`, `status`, `approvedBy`, `scheduledAt`, `sentAt`, `failureReason`. |
| `paymentPromises` | Guardian-provided expected payment date/amount. | `schoolId`, `caseId`, `promisedAmount`, `promisedDate`, `recordedBy`, `status`, `fulfilledByPaymentId`. |
| `financeExceptions` | Finance-review items not resolved by normal workflows. | `schoolId`, `type`, `severity`, `subjectType`, `subjectId`, `status`, `assignedTo`, `resolutionNote`. |

Use additive migrations, composite tenant indexes, foreign keys where the existing database style supports them, and explicit states/enums. Do not delete finance history when a case closes.

### 4.5 Lifecycle and State Machine

```text
Invoice has balance
        ↓
Case opened or matched to active case
        ↓
Contact due ──> Reminder proposed ──> Approval (if policy requires) ──> Sent
        ↓                                             │
        ├── Promise to pay ──> Awaiting date ──> Verified payment / overdue promise
        ├── Payment evidence ──> Finance review ──> Validated allocation or rejected evidence
        ├── Dispute ──> Reminder paused ──> Finance resolution
        └── Escalated ──> Owner/finance decision
        ↓
Outstanding balance reaches zero or approved case resolution occurs
        ↓
Settled / closed (timeline remains immutable)
```

**Case statuses:** `open`, `contact_due`, `awaiting_promise`, `payment_under_review`, `disputed`, `escalated`, `settled`, `closed`.

**Reminder statuses:** `proposed`, `awaiting_approval`, `scheduled`, `submitted`, `delivered`, `failed`, `cancelled`, `suppressed`.

**Evidence statuses:** `submitted`, `under_review`, `accepted`, `rejected`, `superseded`.

All state transitions must be server-authorised, idempotent where triggered by providers/jobs, and recorded in both the case timeline and tenant security/finance audit record where material.

### 4.6 Roles and Permissions

| Action | Owner/admin | Finance | Staff/teacher | Parent/guardian | AI Cash Assurance Officer |
| --- | --- | --- | --- | --- | --- |
| View school dashboard | Yes | Scoped finance view | No by default | Own linked account only | Read-only, filtered by assigned capability |
| Open/assign case | Yes | Yes | No | No | May propose only |
| Add case note/promise | Yes | Yes | No | May submit own promise/request | May draft/summarise only |
| Review payment evidence | Yes | Yes | No | Submit own evidence only | May classify for review only |
| Allocate validated payment | Yes | Yes | No | No | **Blocked** |
| Edit invoice/credit/write-off | Owner controls per policy | Finance with approval policy | No | No | **Blocked** |
| Approve/send reminder | Yes | Per reminder policy | No | No | May propose only |
| Configure policy/template | Yes | Optional delegated finance config | No | No | No |

### 4.7 Interfaces

#### A. Owner Cash Command Centre

Show four concise blocks: **amount overdue**, **payments under review**, **high-priority cases**, and **today’s exception brief**. Each number opens a source-traceable list, not a generic chart. The owner can drill into an exception but cannot bypass finance controls accidentally.

#### B. Finance Collection Workbench

Provide a filterable case queue: priority, age, outstanding band, class, status, next action, assigned staff, reminder state, promise date, and payment-evidence state. A case detail view contains ledger summary, linked invoices, immutable timeline, payment evidence, approved templates, promise/dispute controls, and approval history.

#### C. Guardian Payment Centre

Show only the linked guardian’s permitted invoices, balance, payment instructions, approved receipt upload, payment reference field, receipt history, and contact/help route. Do not show internal collection priority, staff notes, other learners, or AI scoring.

#### D. Policy and Template Centre

Owner/admin defines reminder cadence, channel, quiet hours, opt-out/consent handling where applicable, template versions, amount/age triggers, approval requirement, and escalation threshold. All edits are audited and must be previewed before activation.

### 4.8 Procedures and API Contract

Create a dedicated `cashAssurance` router with typed, tenant-scoped procedures. Illustrative procedure names:

| Procedure | Guard | Purpose |
| --- | --- | --- |
| `getDashboard` | owner/admin or finance | Return source-linked owner/finance metrics and exception counts. |
| `listCases` / `getCase` | owner/admin or finance | Read operational cases with school-scoped filters and pagination. |
| `openCase` / `assignCase` | owner/admin or finance | Open or manage a collection case without modifying the ledger. |
| `recordPromise` | finance; guarded self-service path for linked guardian | Record a non-ledger payment promise with explicit status. |
| `submitPaymentEvidence` | linked guardian or finance | Upload metadata/storage reference; mark under review. |
| `reviewPaymentEvidence` | finance | Accept/reject evidence; acceptance proposes/links to the existing payment flow, never silently marks an invoice settled. |
| `allocatePayment` | finance with validation | Allocate a validated payment to invoices within amount and balance limits. |
| `createReminderProposal` / `approveReminder` / `cancelReminder` | finance/owner by policy | Control reviewable reminder lifecycle. |
| `recordDispute` / `resolveDispute` | finance/owner by policy | Pause/restart eligible reminders while retaining the ledger source of truth. |
| `getPolicies` / `upsertPolicy` | owner/admin | Manage approved reminder policies and templates. |
| `getGuardianLedger` | linked guardian only | Return family-scoped finance and evidence view. |

### 4.9 Automation and AI Rules

Deterministic automation may open a case when an invoice crosses a school-configured overdue threshold, calculate next-action dates, suppress a reminder during a recorded dispute, or flag a broken delivery state. It must be idempotent and never create duplicate cases/reminders for the same configured condition.

The AI Cash Assurance Officer may rank cases, summarise a timeline, propose the next follow-up, identify missing payment-evidence fields, and draft a message from an approved template. It cannot send, approve, alter, allocate, settle, credit, write off, or threaten. The finance user sees the rationale and linked sources before approval.

### 4.10 Provider and Communication Integration

Use existing tenant provider configuration. Payment and notification integrations must be optional, separately configured, and safely testable. Webhook handlers must verify a provider’s documented signature before changing any delivery/payment-related state. Treat provider acknowledgement as separate from confirmed settlement/delivery until the verified event and internal finance rules support a transition.

Reminder runs respect approved recipient scope, consent/preference state, quiet hours, rate limits, template version, case status, dispute state, and manual cancellation. Use the existing `messageLogs` pattern to represent submission and delivery truth.

### 4.11 Metrics and Owner Brief

| Metric | Definition | Source |
| --- | --- | --- |
| Total outstanding | Sum of current source-ledger balances in configured scope. | Invoices and validated allocations. |
| Overdue outstanding | Outstanding amount after invoice due date. | Invoices. |
| Payment under review | Count/value of submitted evidence or provider events awaiting finance action. | `paymentEvidence` / exceptions. |
| Collection workload | Active cases by priority, age, owner, and next action. | `cashAssuranceCases`. |
| Promise reliability | Promises fulfilled, overdue, cancelled, or unresolved. | `paymentPromises` linked to validated payments. |
| Reminder quality | Proposed, approved, submitted, delivered, failed, suppressed, cancelled. | `reminderRuns` and `messageLogs`. |
| Exception brief | Material items requiring a decision today. | Deterministic rules plus approved AI summary. |

The owner brief must always link back to a source list and show its calculation period. Avoid opaque “risk scores” in the first release.

### 4.12 Security, Privacy, and Safety Requirements

1. Validate every amount as a non-negative fixed-precision money value and protect against allocations exceeding the payment or current invoice balance.
2. Scope every query/mutation by `schoolId`; guard guardian reads by relationship to linked learners/accounts.
3. Encrypt provider credentials; never include them in logs, AI prompts, or browser responses.
4. Store receipt uploads in object storage, use access-controlled URLs, scan/validate permitted file type/size, and retain only necessary metadata.
5. Require explicit approval for write-offs, credits, disputed ledger adjustments, and sensitive reminder changes; retain an audit trail.
6. Rate-limit receipt uploads, reminder proposals, reminder sends, and payment-evidence review endpoints.
7. Never put payment-card data, full bank credentials, raw health data, or unrelated learner records into AI prompts.
8. Provide clear error states for provider and data-load failures; do not hide an unavailable cash view.

### 4.13 Test Plan

| Test group | Required coverage |
| --- | --- |
| Tenant and role access | Cross-school case denial; non-finance allocation denial; guardian cross-family ledger denial; AI tool allowlist denial. |
| Financial integrity | Allocation cannot exceed payment amount/invoice balance; outstanding balance does not go negative; rejected evidence does not settle an invoice; duplicate provider event is idempotent. |
| Workflow | Case lifecycle, promise lifecycle, dispute suppression, reminder approval, cancellation, and close/reopen rules. |
| Provider truth | Invalid webhook signature rejected; submitted/delivered states remain distinct; terminal delivery does not downgrade. |
| AI safeguards | AI can propose but not execute blocked financial actions; approval required before reminders; prompt context is tenant-scoped and redacted. |
| UI | Owner dashboard, finance workbench, guardian payment centre, loading/error/empty states, desktop and mobile verification. |
| Release validation | `pnpm check`, `pnpm test`, `pnpm build`, migration review/application, and a school-side role QA protocol. |

### 4.14 Phased Delivery Plan

| Phase | Build | Outcome |
| --- | --- | --- |
| **1. Deterministic finance control** | Case data model, source-ledger dashboard, workbench, case timeline, manual assignment, evidence review, promise/dispute controls, audit, and tests. | A finance team can operate a controlled collection workflow without AI. |
| **2. Reminder governance** | Policies, templates, approval queue, provider-aware dispatch, delivery tracking, suppression, and owner exception brief. | Follow-up is consistent, reviewable, and delivery-aware. |
| **3. Supervised AI Cash Assurance Officer** | Structured case prioritisation, summaries, draft reminders, usage budgets, approvals, tool allowlists, and audit. | AI saves finance time without obtaining financial authority. |
| **4. Learning and scale** | Refined segmentation, recurring owner brief, optional proactive internal task generation, and multi-campus roll-up after tenant controls are proven. | The module becomes a retention driver for growing school groups. |

## 5. Decisions Required Before Implementation

The product owner should decide the following before schema work begins: which payment providers are supported first; whether schools may upload receipt images; the reminder channels and quiet-hour policy; who may create credits/write-offs; the escalation rules for overdue balances; the AI usage budget included per plan; and whether the first AI employee launch is limited to the Cash Assurance Officer or also includes the teacher-supervised Course and Subject Tutor.

The recommended next build is **Cash Assurance Phase 1**. It creates financial control and auditable workflows before automation or AI is allowed to act on top of them.
