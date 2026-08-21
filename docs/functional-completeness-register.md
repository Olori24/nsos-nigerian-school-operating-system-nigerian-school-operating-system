# NSOS Functional-Completeness Register

**Status date:** 21 August 2026  
**Scope:** The tenant setup path that turns a newly created Nigerian school workspace into an operational school workspace.

This register distinguishes **implemented and persistent** workflows from controls that still require a school’s own approved information. It does not treat an empty tenant as a completed setup.

| Setup area | Functional workflow now available | What the school must provide or approve | Completion evidence |
| --- | --- | --- | --- |
| School identity | School name, code, Nigerian state, contact details, and membership context are stored per tenant. | Correct organisation identity and contact details. | School profile record. |
| Academic calendar | Sessions, terms, classes, subjects, timetables, lesson plans, assessments, and result controls persist by tenant. | School’s dates, class arms, teachers, and assessment policy. | Session, term, class, and subject records. |
| Nigerian curriculum | Owners/admins can select an editable NERDC-aligned basic or senior-secondary subject starter, review optional offerings, assign it to actual school classes, and retain the selected source profile. | Approved subjects, Nigerian language, senior pathways, optional offerings, and scheme-of-work content. | Curriculum profile plus class–subject records. |
| Staff and learners | Staff, student, guardian, enrollment, attendance, and parent/student portal paths are tenant-scoped. | Real staff and learner data, invited accounts, and safeguarding processes. | Active staff and student records. |
| Fees and accounting | Fee structures, invoices, payments, receipts, payment evidence, and Cash Assurance workflows persist by tenant. | Approved fee schedule and finance operating policy. | Fee structure record. |
| Physical bank account | Owner/admin can add a 10-digit Nigerian bank account, save its number encrypted, show only the masked number afterward, activate/archive it, and designate the primary account. | The school’s verified bank name, registered account name, account number, and payment-reference rule. NSOS does not independently verify bank ownership. | Active bank-account record. |
| Providers and communication | Payment/notification provider configuration, connection checks, SMS delivery updates, and callbacks are available. | School-owned provider credentials and approved sender configuration. | Ready provider configuration and successful connection check. |
| Public website | School website draft, live preview, publication, and optional custom-domain workflow are available. | Approved content, imagery, contact details, and domain DNS updates if a custom domain is used. | Published website record. |

## Completion rule

NSOS now treats the onboarding journey as complete only when the school identity is recorded, a session/term/class/subject structure exists, a reviewed curriculum profile with class-subject assignments exists, at least one staff member and learner exist, a fee structure and active physical bank account exist, and a school website is published. The tracker deliberately remains incomplete when any of those real records are absent.

## Important boundary

NERDC source materials establish the curriculum framework; NSOS provides editable subject templates and a tenant-owned approval flow rather than copying full lesson texts or assuming a universal senior-secondary subject combination. A school remains responsible for confirming its approved curriculum, examinations, staffing, facilities, and financial account ownership.
