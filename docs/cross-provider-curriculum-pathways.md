# Cross-Provider Curriculum Pathways

**Purpose.** NSOS curriculum now supports every learning operator type: schools, vocational institutes, coaching centres, online training providers, and hybrid learning providers. It does not replace school subjects, schemes of work, lesson plans, assessments, or results. Instead, it gives each active programme an internal learning-pathway structure appropriate to how that operator teaches.

## Curriculum structures by operator

| Operator type | Default pathway structure | Typical internal use | Remains separate |
|---|---|---|---|
| School | School learning sequence | Enrichment, club, intervention, or programme-based learning sequences. | Subjects, classes, terms, schemes of work, lesson plans, assessments, and results. |
| Vocational institute | Vocational competency pathway | Practical skill stages, supervised demonstrations, workshop practice, and competency review points. | Any professional licence, trade certification, public claim, or automatic completion decision. |
| Coaching centre | Coaching plan | Topic plans, practice cycles, review sessions, and instructor-led next steps. | Examination-result claims, automatic grading, or learner outcome promises. |
| Online training provider | Online learning path | Self-paced, live-online, or blended sequence of internal modules and human-reviewed milestones. | Public publication, enrolment, payment collection, or automatic tutor creation. |
| Hybrid learning provider | Hybrid learning path | A combined on-site and online sequence, with delivery guidance for both modes. | School academic records unless a school separately manages those through existing academic workflows. |
| Any operator | Custom learning path | An owner-approved structure for a delivery model not covered by the standard labels. | A claim that NSOS has approved, accredited, or validated the programme. |

## Controlled lifecycle

An owner or administrator first creates a pathway draft for an **active** programme, with a title, pathway type, internal target-level context, delivery guidance, and order. A separate confirmation activates the pathway. Only then can a new module be linked to that active pathway. Modules, milestones, materials, learner progress, private issuer records, and supervised AI Tutor configuration continue to use their own protected workflows and confirmations.

The server checks the school boundary, active programme, active pathway, and programme match before saving a link. Existing modules may remain unlinked, which preserves older school and programme data without forcing a migration. Learners see only pathway/module labels on milestones that belong to their own programme enrolments.

> **Boundary.** A pathway is internal learning design. It does not publish content, enrol a learner, create a tutor account, assess or grade work, mark completion, issue a credential, collect payment, send a message, or alter a school subject, scheme of work, lesson plan, assessment, or result.

## Operating checks

Institutions should use an appropriate pathway label, keep local curriculum and safeguarding review with their accountable staff, and activate only material that the organisation is authorised to deliver. The optional curated evidence library remains a planning aid only; it does not make a pathway aligned, approved, accredited, or certified.

## Interface verification

The public first-setup shell was checked at desktop and 375-pixel mobile widths after this change. It remained readable without horizontal overflow. The pathway workspace is owner/admin-only and is therefore additionally covered by focused client-source and protected-route regression tests when an authenticated institution session is unavailable in the managed preview.
