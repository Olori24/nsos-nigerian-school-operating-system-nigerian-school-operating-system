# AI School Operator Operating Model

## Purpose

The **AI School Operator** gives an owner or administrator a concise view of what needs attention in their own institution. It is not an autonomous chief executive, decision-maker, or background agent. NSOS calculates safe tenant-scoped signals, explains their source and limits, and routes the owner into an existing protected workflow for any consequential follow-up.

> **Detect → explain → recommend → owner approves → protected workflow executes → audit.**

The first release deliberately favours accurate operational readiness over speculative prediction. It does not claim that a student will drop out, that a course is performing better than another, or that a price should change unless the required tenant-scoped data and comparison window exist.

## Signal contract

| Signal area | First-release evidence | Private recommendation boundary | Never done automatically |
| --- | --- | --- | --- |
| Institution readiness | Existing onboarding, website, provider, and communication readiness | Opens the relevant protected setup workspace | Publishing, domain/DNS changes, provider changes, or messaging |
| Learning readiness | Programme, module, milestone, internal material, enrolment, and reviewed-evidence counts | Opens Learning Centre or Course Studio for human review | Programme activation, enrolment, milestone completion, grade, credential, or tutor change |
| Learner practice | The authenticated learner’s own linked active-programme context and approved tutor scope | Suggests reviewing a human-managed milestone or asking the existing Student Learning Copilot for practice support | Programme/progress change, assessment answer, grade, completion, certificate, or learner message |
| Admissions readiness | Tenant-scoped pending application count and approved public-entry configuration state | Opens Admissions to review real applications or configuration | Eligibility decision, admission offer, guardian record, or enrolment |
| Revenue readiness | Existing invoice, collection, outstanding, draft-fee, and provider-readiness aggregates | Opens Finance to review safe next steps | Price, discount, invoice, payment collection, bank, or provider mutation |
| Public-presence readiness | Existing internal programme count and current NSOS website publication state | Opens Website Studio to review an editable website and its separate publication controls | Website publication, domain/DNS change, advert, spend, lead capture, campaign, or message |
| Delivery health | Existing failed email/provider states, automation history, and migration outcomes | Opens Communications, Automation Desk, or Operations Command Center | Sending, retrying, or changing a provider |
| Student support | Aggregated active-enrolment, reviewed-progress, attendance, and available learning-support evidence only | Opens learner support or instructor review workflows | Student messages, interventions, risk labels, grades, pass/fail, or certificate actions |

## Institution memory

An institution can store a concise **owner-approved operating profile**: mission, intended learners, brand tone, teaching philosophy, curriculum approach, pricing approach, policy notes, and operating goals. The profile is tenant-scoped and editable only by owners or administrators. It is used to frame future AI planning but does not contain passwords, API keys, payment-card data, bank details, learner records, guardian records, individual assessment submissions, or staff identity details.

The School Builder may propose this context, but an owner must confirm any persistence. AI audit records retain only source/version/count metadata and never raw operating-profile prose or user prompts.

## Approval-first workflow preferences

Owners and administrators can save a small tenant-scoped **workflow-preference** record for the School Operator dashboard. It supports a review focus, a private review cue, an evidence-display preference, and optional visibility of locally dismissed insights. The review cue is a planning label only; it never creates a job, timer, schedule, background refresh, notification, retry, or external activity.

| Preference | What it changes | What it cannot change |
| --- | --- | --- |
| Review focus | Visually highlights current private insight categories for learning, admissions, revenue, operational readiness, or a balanced review. | The signals calculated, their underlying records, their severity, or any protected action. |
| Private review cue | Lets the owner record a daily, weekly, or monthly internal review intention. | Create monitoring, automation, reminders, scheduled refreshes, or communication. |
| Evidence display | Chooses a concise source label or the standard metric-and-source presentation in the owner’s private dashboard. | Hide tenant boundaries, invent evidence, change data, or make an insight actionable on its own. |
| Dismissed-insight visibility | Lets the owner include locally dismissed records in the dashboard for context. | Reopen an insight, execute a handoff, or alter the originating workflow. |

Saving preferences is owner/admin-only, tenant-scoped, confirmation-gated, rate-limited, and audit-recorded with bounded enum/boolean metadata only. It does not store prompts, operating-profile text, learner information, credentials, finance information, or raw evidence in the preference record or audit metadata.

> **A preference never removes a confirmation gate, role check, rate limit, required human review, or separate protected workflow.**

## Visible owner-authority policy

The School Operator dashboard now presents its operating authority directly alongside the private review controls. It states that insight refresh and planning are private preparation only, that a human remains responsible for assessment, grades, results, completion, and credentials, and that publishing, messages, campaigns, spend, fees, payments, admissions, enrolment, providers, and domains remain separately confirmed workflows.

It also makes the absence of an unattended autopilot explicit. NSOS does not start a background loop, automatic retry, or triggered consequential action from School Operator; a private review cue remains only an owner’s planning preference.

## Recommendation and approval lifecycle

Every insight includes a source label, a generated timestamp, a severity, an explainable evidence summary, a permitted destination, and a visible limitation. A recommendation can be dismissed locally by the tenant or opened in its owning workspace. It cannot execute a side effect itself.

| Stage | System responsibility | Human responsibility |
| --- | --- | --- |
| Detect | Calculate tenant-scoped aggregate signal or readiness state | Review context and limitations |
| Recommend | Present a concise private recommendation and permitted handoff | Decide whether the recommendation is relevant |
| Prepare | Let an existing protected workspace prepare an editable draft where supported | Review content and required real information |
| Approve | Enforce its own confirmation gate, role check, rate limit, and audit record | Explicitly approve the named action |
| Execute | Run only the existing bounded workflow | Review the result and remaining independent controls |

## Academic and learner safeguards

NSOS may recommend low-stakes practice, topic review, instructor review, or a next protected learning workspace when supported by aggregate and learner-owned information. It must not automatically grade, alter assessment results, pass or fail a learner, complete a milestone, issue a certificate, infer a sensitive attribute, label a learner as a dropout, or contact a learner.

The Student Learning Copilot remains a support tool. It can explain approved topics and suggest practice, but it cannot complete assessed work, decide results, or substitute for an accountable instructor.

## Certificates, public verification, and revenue

The current certificate workflow remains separately human-confirmed and private. A future public verification feature requires a dedicated privacy review, issuer policy, consent/disclosure decision, and verification record model before it can be released. The School Operator can show **certificate readiness** only; it cannot issue a certificate or create a public verification claim.

Similarly, revenue recommendations may describe missing readiness information or route to Finance. They cannot change pricing, create a charge, collect a payment, activate a provider, or infer conversion, churn, lifetime value, or demand where NSOS lacks measured historical data.

## Continuous monitoring and system health

The School Operator is refreshed on-demand in the first release from current tenant-scoped data. It must not use `setInterval`, `node-cron`, or an in-process timer. A saved private review cue is not a schedule. Any future recurring refresh must use a deployed, idempotent Heartbeat endpoint, a task UID persisted on the owning record, and explicit schedule management. It will generate private records or owner-visible health information only; it will not send messages or retry external actions automatically.

System health uses available workflow failures and configuration status. It reports **healthy**, **attention required**, or **needs review** rather than promising complete infrastructure monitoring that the platform does not yet collect.

## Non-negotiable boundaries

The AI School Operator never crosses institution boundaries, exposes another tenant’s data, fabricates people or outcomes, invents certificates or grades, fabricates payments, changes ownership, makes discriminatory admissions decisions, publishes content, changes a domain, changes provider settings, sends communications, creates accounts, enrols learners, alters finance, or executes an unreviewed academic change.
