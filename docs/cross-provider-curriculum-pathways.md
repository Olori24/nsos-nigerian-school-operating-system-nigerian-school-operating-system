# Cross-Provider Curriculum Pathways

**Purpose.** NSOS curriculum now supports every learning operator type: schools, vocational training centres, coaching centres, online training providers, hybrid learning providers, and corporate academies. It does not replace school subjects, schemes of work, lesson plans, assessments, or results. Instead, it gives each active programme an internal learning-pathway structure appropriate to how that operator teaches.

## Curriculum structures by operator

| Operator type | Default pathway structure | Typical internal use | Remains separate |
|---|---|---|---|
| School | School learning sequence | Enrichment, club, intervention, or programme-based learning sequences. | Subjects, classes, terms, schemes of work, lesson plans, assessments, and results. |
| Vocational training centre | Vocational competency pathway | Practical skill stages, supervised demonstrations, workshop practice, and competency review points. | Any professional licence, trade certification, public claim, or automatic completion decision. |
| Coaching centre | Coaching plan | Topic plans, practice cycles, review sessions, and instructor-led next steps. | Examination-result claims, automatic grading, or learner outcome promises. |
| Online training provider | Online learning path | Self-paced, live-online, or blended sequence of internal modules and human-reviewed milestones. | Public publication, enrolment, payment collection, or automatic tutor creation. |
| Hybrid learning provider | Hybrid learning path | A combined on-site and online sequence, with delivery guidance for both modes. | School academic records unless a school separately manages those through existing academic workflows. |
| Corporate academy | Workplace capability path | Role-relevant capability themes, workplace practice, simulations, and manager-reviewed development checkpoints. | An employment decision, compliance sign-off, professional qualification, public claim, automatic completion, or automatic credential decision. |
| Any operator | Custom learning path | An owner-approved structure for a delivery model not covered by the standard labels. | A claim that NSOS has approved, accredited, or validated the programme. |

## Controlled lifecycle

An owner or administrator first creates a pathway draft for an **active** programme, with a title, pathway type, internal target-level context, delivery guidance, and order. A separate confirmation activates the pathway. Only then can a new module be linked to that active pathway. Modules, milestones, materials, learner progress, private issuer records, and supervised AI Tutor configuration continue to use their own protected workflows and confirmations.

The server checks the school boundary, active programme, active pathway, and programme match before saving a link. Existing modules may remain unlinked, which preserves older school and programme data without forcing a migration. Learners see only pathway/module labels on milestones that belong to their own programme enrolments.

> **Boundary.** A pathway is internal learning design. It does not publish content, enrol a learner, create a tutor account, assess or grade work, mark completion, issue a credential, collect payment, send a message, or alter a school subject, scheme of work, lesson plan, assessment, or result.

## Operating checks

Institutions should use an appropriate pathway label, keep local curriculum and safeguarding review with their accountable staff, and activate only material that the organisation is authorised to deliver. The optional curated evidence library remains a planning aid only; it does not make a pathway aligned, approved, accredited, or certified.

## Interface verification

The public first-setup shell was checked at desktop and 375-pixel mobile widths after this change. It remained readable without horizontal overflow. The pathway workspace is owner/admin-only and is therefore additionally covered by focused client-source and protected-route regression tests when an authenticated institution session is unavailable in the managed preview.

## Institution-aware curriculum entry

The school Academic workspace continues to provide NERDC templates, classes, subjects, terms, timetables, schemes of work, and lesson plans. NSOS now renders that workspace **only** when the active institution type is `school`. Vocational training centres, coaching centres, online training providers, hybrid learning providers, and corporate academies now open an institution-specific curriculum start page instead. It explains the appropriate pathway structure, shows real programme/pathway readiness to owners and administrators, and hands them into the protected Learning Centre to create programmes, pathways, modules, milestones, and materials.

Non-school navigation labels the same destination **Curriculum** and its group **Learning operations**, preventing the former school-only funnel from being presented as their setup path. A focused UI regression covers all five non-school operating types, the school-only route guard, the pathway handoff, the removal of NERDC content from the non-school starter, and the mobile-safe boundary language.

## Corporate academy boundary

Corporate academies use a **workplace capability path** for owner/admin-reviewed internal development design. A pathway can name a role-relevant capability, intended employee group, delivery guidance, and review sequence; linked modules can cover learning, practice, projects, resources, or simulations. It does not create employee accounts, connect a personnel record, decide performance, approve compliance, complete a learner, send a message, collect a payment, issue a certificate, or produce a public or accreditation claim. Any employment, performance, compliance, or professional-qualification decision remains with the accountable organisation and its authorised process.

The refreshed desktop first-workspace shell was visually checked after this extension and visibly names vocational training centres and corporate academies in the learning-organisation scope. The 375-pixel mobile capture remained in the app’s loading state; the actual type selector, owner/admin curriculum workspace, workplace-capability path, route guard, and safety copy are therefore additionally covered by focused source, protected-route, and interface regressions.

## Linked learner evidence

An active linked learner can submit a concise private evidence note for an active milestone in their own programme enrolment. Owners and administrators can review tenant evidence; a teacher or staff member can review only where they hold both an active staff profile and a current instructor assignment for the programme, either programme-wide or for the matching cohort. The reviewer may accept the note or return it with a follow-up comment. This is separate from reviewed milestone progress and does not change completion, grades, certificates, private issuer records, payments, messages, accounts, tutor assignments, public content, or public credentials. See the [cross-provider learning evidence operating model](cross-provider-learning-evidence-operating-model.md) for the lifecycle and access boundaries.
