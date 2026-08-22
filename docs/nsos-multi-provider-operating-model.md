# NSOS Multi-Provider Learning Operations Model

**Status:** Design baseline for a controlled, additive expansion. This document does not change a live tenant, create learning records, or change any school workflow.

## Product boundary

NSOS will serve Nigerian schools, vocational institutes, coaching centres, and online training providers as **isolated learning-organisation tenants**. The existing `schools` tenant boundary remains the database and authorization boundary during this expansion; the product may use the broader “learning organisation” language in suitable interfaces, but it must not rewrite or reinterpret existing school data.

| Operating type | Typical delivery | Primary operating unit | Existing NSOS concepts retained |
|---|---|---|---|
| `school` | Term-based in-person or blended education | Session, term, class, subject | Students, guardians, academics, results, attendance, fees |
| `vocational_institute` | Practical, skills-based programmes | Programme, cohort, practical module | Learners, instructors, attendance, fees, communications |
| `coaching_centre` | Exam preparation, tutoring, professional coaching | Programme, cohort or class group | Learners, instructors, attendance, fees, notices |
| `online_training_provider` | Live online, self-paced, or blended training | Programme, cohort or online run | Learners, instructors, enrolment, progress, fees, notices |
| `hybrid_learning_provider` | A combination of the above | Programme plus school or cohort structures | Only the operator’s explicitly configured modules |

The operating type is an **owner-approved configuration**, not an inference from a tenant’s name, website, payments, or records. Existing tenants default to `school`; no tenant is converted automatically.

## Shared vocabulary and compatibility rules

The expansion introduces a narrow shared vocabulary without removing school-specific terminology. A **learner** is the cross-provider label for an existing student record or a future programme-only participant. An **instructor** is the presentation label for an existing teacher-role member where the tenant is configured as a vocational, coaching, online-training, or hybrid provider. A **programme** is an owner-approved offering such as a fashion-design course, WAEC revision cohort, software bootcamp, or online certificate preparation course.

> Existing school sessions, terms, classes, subjects, student/guardian links, results, and admissions flows remain canonical for `school` tenants. Programme data is additive and must never overwrite class assignments, academic history, results, fees, or guardian links.

| Cross-provider entity | Purpose | Required safety boundary |
|---|---|---|
| Tenant operating type | Controls terminology, onboarding prompts, and available programme surfaces | Owner/admin-only mutation; audited; legacy default is `school` |
| Programme | A reviewable learning offering with a title, delivery mode, duration guidance, and status | Tenant-scoped; draft by default; no public publication or automatic sale |
| Cohort | A named scheduled run or group within a programme | Tenant-scoped; optional for self-paced delivery; no automatic learner creation |
| Instructor assignment | Connects an authorised staff/teacher member to a programme or cohort | Requires a real existing staff member and authorised role; no account creation |
| Programme enrolment | Links an existing learner/student record to a programme or cohort | Review-first; tenant-scoped; no fabricated learner records |
| Programme attendance and progress | Captures delivery participation and operational progress | Visible only to authorised staff and the linked learner/guardian where applicable |
| Completion decision | Records a human-confirmed completion outcome | Never auto-issues, signs, verifies, or claims a credential or certificate |

## Role and access mapping

No new global account roles are required in the first release. This avoids broadening permissions while the platform retains its audited permission model.

| Existing NSOS role | Multi-provider presentation | First-release access |
|---|---|---|
| Owner / admin | Learning organisation owner / operations admin | Configure operating type, create programme drafts, manage cohorts and real assignments, review enrolments, view reports |
| Teacher | Instructor / facilitator | View only assigned programme and cohort operations; record permitted attendance and progress |
| Staff | Operations staff | Only explicitly granted learner administration and communications work |
| Finance | Finance officer | Existing tenant finance workspace only; programme payment setup remains review-first and does not alter ledger behaviour |
| Student | Learner | Only own enrolments, published progress, approved resources, and relevant notices |
| Parent / guardian | Sponsor / guardian | Only linked minor learner data where a guardian relationship already exists; adult learners do not gain a guardian by default |

All new procedures must use the existing active membership check and tenant scope. Interface concealment is not an authorization boundary.

## Programme lifecycle

The first operational release should support a deliberately small, auditable lifecycle:

1. An owner or administrator creates an **inactive draft programme** from real organisation-approved details.
2. An owner or administrator explicitly reviews and confirms activation. Activation makes the programme available to internal authorised operations only; it does not publish a public page, open payment collection, enrol a learner, or issue a credential.
3. The organisation creates an optional cohort and assigns an existing authorised instructor.
4. An authorised operator enrols an existing learner after review. A programme enrolment is not a new user account and does not send invitations automatically.
5. Instructors record permitted attendance or progress. Completion requires an explicit human decision with a safe operational status such as `completed`, `withdrawn`, or `in_progress`.

The design intentionally excludes automatic certificates, credential verification, public claims, online examination proctoring, automated grading, automated payment collection, external course-marketplace publishing, and autonomous messages. Those are separate, approval-gated future domains.

## Concierge and onboarding behaviour

The Enterprise Concierge will be given the active tenant operating type and a strictly allowlisted set of existing programme destinations. It can use the selected vocabulary—such as **programme**, **cohort**, or **instructor**—and route a user into a protected workflow. It will not infer operating type, create a programme, enrol a learner, assign an instructor, activate a programme, configure course-provider credentials, send invitations, or claim a learner completed training.

Onboarding will first ask the owner to select the organisation’s real operating type. The setup experience then routes to the appropriate, review-first foundations. A school tenant continues to see its existing academic foundation; a vocational or training tenant is guided to programme setup without being forced into school terms, classes, or result workflows.

## Release guards

Before a programme release is enabled for a tenant, NSOS must validate all of the following:

- Existing school tenants render unchanged with the `school` default.
- Every programme, cohort, assignment, enrolment, attendance, and completion query is constrained by tenant ID.
- A user cannot reach an unauthorised programme or learner record by changing an ID in a request.
- Draft, activation, enrolment, and completion events have explicit confirmations and audit events.
- No seed learners, staff, attendance, completion records, reviews, credentials, or payment records are created to demonstrate the feature.
- Empty, unavailable, loading, and error states explain the next safe recovery step.
- Owner/admin and instructor/learner interfaces are verified on mobile and desktop before release.

## Delivery sequence

The recommended path is to ship in small vertical releases. First add tenant operating type and programme foundations. Next add controlled programme, cohort, and assignment workflows. Then add learner programme enrolment, progress, and attendance. Finally align Concierge and onboarding copy and validate a school tenant, a vocational institute, a coaching centre, and an online training provider using empty, non-production tenants.

This sequence protects the existing school product while giving each new operator a real, focused operating workflow rather than a superficial label change.
