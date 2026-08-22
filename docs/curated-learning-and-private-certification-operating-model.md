# Curated Learning Design and Private Certification Operating Model

**Purpose.** This operating model explains the first-release NSOS workflow for source-aware course planning, owner-selected learning-experience design, and controlled institution-issued private records. It supports Nigerian schools and other learning operators without representing NSOS as a curriculum authority, accreditor, professional body, examination board, or credential-verification service.

## Curated evidence mode

NSOS uses a fixed, reviewed source library rather than unrestricted research at course-launch time. Its initial sources cover the Nigerian basic education levels published by NERDC, the senior secondary levels published by NERDC, and UNESCO’s student AI competency framework. The detailed source record preserves the discovered scope, URLs, and limits.[1]

| Source use | Permitted | Not permitted |
|---|---|---|
| Course structure | An owner/admin may select a source as an optional reference when producing an editable internal draft. | Claiming that a programme is aligned, approved, endorsed, accredited, or certified by that source. |
| Institution source register | An owner/admin may add a title, organisation, URL, category, and limited allowed-use statement for a current-tenant planning reference. | Copying source content into NSOS, treating a URL as legal permission, or accepting another tenant’s source identifier. |
| Learning experience | An owner/admin selects pace, support style, practice mode, and a short delivery/accessibility note. | Diagnosing a learner, changing a supervised AI Tutor automatically, or collecting learner private conversations for the profile. |

The server resolves selected source identifiers itself. It rejects unavailable curated IDs and tenant source IDs that are not active in the requesting institution. Course Studio receives only the resulting reference metadata and uses it as limited planning context. Source URLs, model prompts, and content are not reproduced in the audit trail; audit events retain only source counts and safe categories.

## Private institution-issued record workflow

> **Definition.** An NSOS-powered private issuer record is a tenant-scoped record created by an institution after its own evidence review. It is not accreditation, a professional qualification, an official certificate, a globally recognised credential, or a public verification product.

| Stage | Required human action | Server-enforced boundary |
|---|---|---|
| 1. Policy draft | Owner/admin defines an active programme, issuer name, private record title, and completion criteria; then confirms. | The policy is stored as a draft. No learner record is issued. |
| 2. Policy activation | Owner/admin separately confirms the selected draft policy. | Only an active policy may be used for issuance. |
| 3. Completion evidence | A human confirms the learner’s enrolment as completed and reviews all active milestones as `reviewed_complete`. | The enrolment, policy, programme, milestones, and learner all must belong to the same tenant and programme. |
| 4. Private issuance | Owner/admin submits an evidence summary and separately confirms one issue action. | Duplicate issuance is rejected. The record remains private with public verification disabled. |

Every stage is owner/admin-only, rate-limited, tenant-scoped, and audit-recorded. Issuance does **not** send a message, create a user account, trigger payment, publish content, generate a PDF, create a public URL, or alter tutor access. A later release would require a separately assessed design before it could offer a downloadable artefact or any verification experience.

## Interface verification

The public first-setup shell was checked at desktop and 375-pixel mobile widths after this addition. It remained readable without horizontal overflow. The evidence and private-record controls are owner/admin-only and therefore are additionally covered by focused client-source regression assertions when an authenticated owner workspace is unavailable in the managed preview session.

## Operational checks

Institutions should keep the following controls outside NSOS’s automated planning scope. They should confirm local curriculum requirements, learner welfare and accessibility needs, staffing capacity, internal approval authorities, any legal use of external material, and the meaning of any institution-issued record. They must not describe a private issuer record as a government approval, professional licence, accredited qualification, or third-party verified credential unless they have independent, appropriate authority and evidence.

## References

[1] [Curated evidence source library — 22 August 2026](./curated-evidence-source-library-2026-08-22.md).
