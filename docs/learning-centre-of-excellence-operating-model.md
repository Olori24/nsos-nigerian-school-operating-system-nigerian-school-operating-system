# NSOS Learning Centre of Excellence Operating Model

**Status:** Product and engineering operating model for controlled implementation

NSOS treats each institution as an independently governed learning organisation. The Learning Centre of Excellence extension adds a common programme-curriculum layer that works beside—not in place of—the established school academic layer. Every curriculum record stays scoped to one `schoolId`, and the model deliberately begins empty. It never invents learners, instructors, fees, certificates, providers, public courses, or outcomes.

## Curriculum domains

| Institution operating type | Existing foundation retained | Learning Centre extension | Explicit boundary |
|---|---|---|---|
| School | Sessions, terms, classes, subjects, schemes of work, lesson plans, assessments, and results | Optional programme pathways for club, enrichment, short course, or blended learning operations | School academic curriculum remains authoritative for termly subjects and results. |
| Vocational institute | Programmes, cohorts, instructors, enrolments, attendance, fee structures, and completion review | Practical pathways, modules, ordered milestones, and instructor delivery tracking | A completed milestone is not a certificate, trade qualification, or regulated competence claim. |
| Coaching centre | Programmes, cohorts, instructors, learners, and attendance | Coaching plans, topic modules, practice milestones, and delivery evidence | NSOS does not auto-grade or represent readiness for an examination. |
| Online training provider | Live, self-paced, and blended programme delivery modes | Online modules, learner progress review, and delivery references | NSOS does not publish a public course, enrol a learner, or create an external platform account. |
| Hybrid learning provider | Both school academic and programme operations | Linked but independently governed school curriculum and programme pathways | No automatic data transfer, learner progression, finance action, or result publication occurs between layers. |

## Additive learning pathway model

The model is additive to `learningPrograms`, `programCohorts`, `programInstructorAssignments`, and `programEnrollments`.

| Entity | Ownership and scope | Intended lifecycle | Safety condition |
|---|---|---|---|
| Learning pathway | One active or draft programme within one institution | Draft → active → archived | Owner/admin creates and activates only after explicit confirmation. |
| Curriculum module | One pathway, with an ordered internal learning unit | Draft → active → archived | A module is internal operational content, not a published course page. |
| Milestone | One module, with a sequenced learning checkpoint | Draft → active → archived | It describes an approved learning checkpoint, never an automatic grade or credential. |
| Instructor delivery record | One pathway module or cohort, assigned to an existing institution staff record | Planned → delivered or returned | The record uses an existing staff reference; it creates neither an account nor an invitation. |
| Learner milestone progress | One active programme enrolment and one active milestone | Not started → in progress → reviewed complete | The learner can view only their own records. Completion requires an authorised human confirmation and is not a certificate. |

## Role and action boundaries

| Role | Permitted learning-centre actions | Not permitted through this layer |
|---|---|---|
| Owner / administrator | Create, activate, archive, and review pathways, modules, milestones, delivery records, and reviewed learner progress | Directly issue credentials, alter finance records, send invitations, create learner/staff identities, publish public courses, or change external providers. |
| Instructor / teacher | View assigned curriculum delivery work where a future role-scoped route grants it; submit delivery evidence for review | Modify institution-wide curriculum, enrol learners, activate fees, publish claims, or confirm a credential. |
| Learner / student | View own programme pathway, module order, and reviewed milestone progress | View another learner’s plan or progress; mark a milestone complete; access staff, finance, or provider data. |
| Parent / guardian | No programme curriculum view unless a future explicit guardian-link policy is designed and approved | Access adult learner or unrelated programme information. |

## Controlled service-capacity validation

The purpose of capacity validation is to exercise supported boundaries and identify operational failures without creating production-like records or triggering external side effects.

| Validation surface | Controlled action | Safe context | Exclusions |
|---|---|---|---|
| Authentication and membership | Verify authenticated owner/admin, learner, and denied-member route responses | Existing authorised test identities or empty authorised institutions | No impersonation, credential sharing, or session bypass. |
| Tenant isolation | Query or submit a cross-institution identifier and expect denial or empty scope | Institution IDs controlled by the same authorised owner | No extraction, enumeration, or bulk collection of another tenant’s data. |
| Curriculum lifecycle | Create a draft pathway/module/milestone and validate activation confirmation rules | Empty institution or explicitly authorised test programme | No public publication, credential issuance, automatic learner progression, or live course promotion. |
| Learner progress | Validate that only a linked learner sees their own reviewed progress | Explicitly authorised test learner data or an empty result state | No fabricated learner profiles, marks, certificates, or claims. |
| Communication / providers | Inspect readiness and durable failure states only | Existing provider configuration with no delivery request | No live messages, payment tests, secret changes, DNS changes, or sender changes. |
| Finance | Validate separate internal fee-structure rules and permission denial | Empty draft context | No invoice issue, payment collection, bank transfer, refund, or receipt approval. |
| Resilience | Run type checks, focused route/UI tests, and production build | Sandbox and managed preview | No destructive database operations or unbounded load generation. |

## Release evidence

Each Learning Centre release must include the following evidence before publication: reviewed additive migration SQL; protected procedure tests; tenant-isolation and denied-access tests; lifecycle confirmation tests; learner-only visibility tests; UI empty, loading, and error states; TypeScript validation; a production bundle result; and a documented statement of external capabilities that remain unavailable or require separate approval.

## Controlled capacity-validation record — 22 August 2026

The isolated NSOS suite exercised authenticated membership boundaries, institution switching, profile categorisation, programme operations, curriculum modules and milestones, reviewed learner progress, protected Concierge planning, and the retained school workflows. The final full run completed with **323 passing tests across 93 passing test files**. One separate sender-authorization integration assertion remained blocked because the configured `resend.dev` sender domain is not verified in the connected Resend account. This is an expected external dependency, not a bypassable application defect: it remains tied to the unresolved compliant `nsos.ng` registration and sender-verification path.

No live payment, invitation, message, DNS, provider credential, account-creation, certificate, public-course, or destructive database action was performed during the validation. The focused Learning Centre and tenancy suite separately passed **28 tests**, including owner/admin gating, confirmation requirements, safe audit metadata, learner-only visibility, and membership-denied access paths.

> **Operating principle:** NSOS helps institutions organise and evidence approved learning. It does not autonomously judge competence, issue a certificate, send communications, collect money, create identities, or make public claims.
