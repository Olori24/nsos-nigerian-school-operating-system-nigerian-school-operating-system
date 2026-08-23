# Cross-Provider Learning Evidence Operating Model

## Purpose and scope

NSOS allows a linked learner to submit a concise, internal evidence note for an active milestone in their own active programme enrolment. The workflow is available to schools, vocational training centres, coaching centres, online training providers, hybrid learning providers, and corporate academies. It supports a reviewer’s professional learning conversation; it is not an assessment engine, a credentialing process, or a public portfolio.

The first release intentionally accepts concise text only. It does not accept receipt images, identity documents, videos, file uploads, or other attachments. This keeps the evidence surface narrowly scoped while the institution establishes its own appropriate learning, safeguarding, and data-handling practice.

## Evidence lifecycle

| State | Meaning | Permitted next step |
|---|---|---|
| `submitted` | The linked learner has submitted or resubmitted a concise note for review. | An authorised reviewer may accept it or return it with a follow-up note. |
| `reviewed_accepted` | An authorised reviewer has accepted the evidence note as an internal learning record. | It remains accepted. A later reopening mechanism is not included in this release. |
| `reviewed_returned` | An authorised reviewer has returned the note with a required follow-up comment. | The learner may revise and resubmit the concise note. |

Each tenant has at most one evidence submission for an enrolment and milestone pair. The server scopes the record to the tenant, enrolment, programme, and active milestone before it is created, updated, listed, or reviewed.

## Role map and access control

| Role | Permitted action | Server-side condition |
|---|---|---|
| Linked learner | Submit or resubmit evidence for their own active enrolment and active milestone. | The authenticated user must be an active student member and must match the learner profile on the enrolment. |
| Owner or administrator | View and review all evidence records in their active tenant. | The authenticated member must hold an active owner or administrator role in that tenant. |
| Teacher or staff reviewer | View and review only evidence for an actively assigned programme and, where applicable, the learner’s matching cohort. | The authenticated member must also own an active staff profile and active programme-instructor assignment. |
| Parent, unassigned staff member, unrelated learner, or external user | No evidence submission or review access. | The protected route rejects the request before an evidence helper can act. |

> **Tenant boundary.** The client only receives data returned by protected procedures. The database helpers repeat tenant, programme, enrolment, milestone, learner-profile, and reviewer-assignment checks; hiding a control in the interface is never used as authorisation.

## Review and audit discipline

Submission and review both require an explicit confirmation and use the existing Learning Centre mutation rate limit. Audit records identify the operational event and limited safe metadata such as the evidence length, review outcome, and declared non-effects. They do not store the raw learner evidence or the reviewer’s free-text note.

The review queue exposes only the records a reviewer is authorised to review. Owners and administrators receive tenant-scoped records; an assigned instructor receives only their programme-wide or matching-cohort records. A data-access rejection from the protected helper does not create a review result.

## Hard boundaries

> **Evidence acceptance is not completion.** It does not change milestone progress, programme completion, grades, certificates, private issuer records, payments, messages, accounts, tutor assignments, public pages, or public credentials.

The feature does not establish academic, professional, regulatory, employment, performance, compliance, licensing, or accreditation outcomes. Any such decision remains with the organisation and its accountable, authorised process.
