# NSOS CBT Phase 1 Architecture Inspection

**Inspection date:** 20 September 2026  
**Status:** Architecture inspection only; no implementation, deployment, production-readiness, capacity, or external-verification claim is made.

## Executive conclusion

The inspected NSOS repository contains reusable foundations for a computer-based testing (CBT) slice, but it does not contain an evidenced CBT implementation. The strongest existing primitives are tenant membership and authorization, canonical student identity, academic sessions/classes/subjects/enrollments, staff and class-subject assignment, aggregate assessment/results, audit and rate-limit utilities, migration safeguards, and the existing tenant-aware dashboard and portal shell.

CBT Phase 1 should be an **additive domain**. It should not overload `enrollments` to mean exam eligibility, `classes` to mean an examination venue, or `scores` to mean an exam attempt. A CBT registration should explicitly connect a candidate to a particular exam sitting, paper, eligibility decision, candidate snapshot, and—if required—center/seat allocation. An attempt should retain its own timing, answer, submission, and finalization state. Only a validated, finalized CBT result should cross the boundary into the existing academic results workflow.

The most important architecture condition is to centralize same-school and same-context validation before CBT writes. Existing route middleware usually checks an active membership and permission, but several lower-level helpers trust caller-supplied related IDs. Existing teacher permissions are also broader than an assignment-scoped CBT operation, and the current results workflow does not prove candidate enrollment, class scoping, assessment status, or immutable publication. CBT must not reproduce those gaps.

## Evidence boundary

This report synthesizes the supplied independent inspections of student, teacher, academic, results, authentication, database, communications, and UI areas. Findings are grounded in the cited repository symbols and tests in those inspections. Absence statements mean that no corresponding CBT model, procedure, component, migration, or test was evidenced in the inspected surfaces; they are not a formal proof about code outside the inspected repository areas. No source files were edited during the inspection except this report, and no database or external service was called.

## Current NSOS primitives to reuse

| Area | Current primitive | Reuse boundary and qualification |
|---|---|---|
| Tenant and identity | `schoolMemberships`, `accessSchool`, `protectedProcedure`, `managementProcedure`, `familyPortalProcedure`, `server/roles.ts` | Use active membership and verified server-side role/permission checks on every CBT procedure. UI visibility is not authorization. Add explicit CBT capabilities rather than inheriting broad `academics.write` or `results.write` semantics. |
| Student identity | `studentProfiles`, admission-number uniqueness, optional `userId`, `getStudentEnrollmentRecord` | Use `studentProfiles` as the canonical candidate identity and admission-number anchor. Project only required candidate fields. Because `userId` is nullable and not shown as unique, CBT must resolve ambiguous linked profiles explicitly before candidate self-service. |
| Academic context | `academicSessions`, `academicTerms`, `classes`, `subjects`, `classSubjects`, `enrollments` | Use these as prerequisite context and foreign-key inputs. An academic enrollment is not CBT eligibility. Require same-school and session/term/class consistency in a server-side resolver. Do not use `classId` as an exam center or seat. |
| Staff and allocation | `staffProfiles`, school membership role `teacher`, `classSubjects`, `aiTutorTeacherProcedure` | Use active staff identity and class-subject assignment as the starting point for teacher scope. Add CBT assignment/session records if effective dates, co-invigilators, or reassignment history are required. Do not treat generic `academics.write` as proof of teacher assignment. |
| Academic assessment/result | `assessments`, `scores`, `gradeScales`, `resultPublications`, `calculatePercentage`, `resolveGrade` | Use an adapter at the finalization boundary only. Existing rows are aggregate academic records, not question-level attempts. Existing score and publication paths need additional candidate, class, lifecycle, publication-snapshot, and separation-of-duty checks before CBT can consume them. |
| Authentication and sessions | `sdk.authenticateRequest`, active/revoked session handling, `ctx.user.id`, `ctx.user.sessionId` | Bind candidate submission, invigilation, marking, and publication audits to the authenticated session and actor. Do not add a parallel login or token mechanism. |
| Audit and controls | `recordSecurityAuditEvent`, metadata sanitization, `consumeSharedRateLimit` | Reuse for configuration, roster freeze, attempt start/submit, correction, publication, invitation, and export actions. Add idempotency and rate limits for high-impact CBT mutations. Never place answers, answer keys, raw contacts, or sensitive telemetry in audit metadata. |
| Persistence operations | `getDb()`/`database()`, Drizzle migrations, explicit `db.transaction(...)`, migration batch checksum/idempotency pattern | Add reviewed CBT schema and ordered migrations. Use transactions for attempt creation with snapshots, answer/finalization transitions, and result integration. Use database-enforced idempotency and handle duplicate-key races; a pre-read alone is insufficient. |
| Portal and communications | `getStudentPortal`, `portal.student`, `PortalResults`, guardian linkage, invitation lifecycle, announcements/message logs | Extend authenticated student/guardian projections only where product requirements require it. Do not use broad communications read/send procedures as CBT authorization, and do not assume queued non-in-app messages are delivered. |
| UI shell | `Home.tsx` `View`/navigation/`Workspace`, lazy loading, `InstitutionSwitcher`, existing Radix/Tailwind primitives, mobile drawer and theme conventions | Add one lazy CBT workspace inside the existing shell. Keep tenant switching, server queries, mobile patterns, reduced-motion behavior, and semantic components. The current dashboard uses in-memory view state rather than URL routing. |
| Import and onboarding | Student, staff, and academic migration workspaces with preview, confirmation, checksum/idempotency, transaction, and audit patterns | Reuse these patterns for bounded CBT imports only after CBT schemas and ownership rules are defined. Do not import exam results or attempts through the existing class/subject migration path. |

## Additive CBT domain boundaries

CBT should own the lifecycle of an exam sitting and its execution. The academic domain should remain the source of school periods, class/subject context, and released academic records. The student domain should remain the source of canonical identity and academic membership. The results domain should receive only validated final outputs.

The CBT boundary should contain the following responsibilities:

1. **Exam configuration.** Define the exam, sitting, paper or section, delivery window, duration, attempt policy, and applicable class/subject/session/term context.
2. **Question and paper versioning.** Store versioned paper/question references and selected ordering. A started attempt must use an immutable snapshot or immutable version references so later authoring changes cannot alter a live or completed attempt.
3. **Candidate registration and eligibility.** Record the decision that a particular student is eligible for a particular sitting. Preserve a candidate snapshot for identity and relevant accommodations. Do not infer eligibility from a general enrollment alone.
4. **Operational allocation.** If Phase 1 includes physical administration, represent center, room, device, or seat allocation separately from academic classes. Validate capacity and assignment rules server-side. If allocation is not in the Phase 1 contract, it should remain outside the first delivery boundary rather than being approximated with `classId`.
5. **Attempt execution.** Own start, timing, answer persistence, reconnect behavior, submission, expiry, finalization, and duplicate-request handling. The browser is not authoritative for time, identity, score, or final state.
6. **Scoring and result release.** Score from the attempt snapshot under a versioned scoring policy. Keep moderation, approval, publication, withdrawal, and correction distinct from attempt submission.
7. **Audit and access control.** Record consequential actions with authenticated actors and protect candidate data, question content, answer keys, and released results according to role and object scope.

## Minimum tenant-scoped entities and lifecycle states

The following is the minimum proposed Phase 1 persistence boundary. These are design requirements, not existing repository entities.

| Entity | Required tenant and relationship keys | Minimum lifecycle states |
|---|---|---|
| `cbtExams` / sittings | `schoolId`; session/term; subject; optional class scope; creator; schedule | `draft` → `scheduled` → `open` → `locked` → `closed`; `withdrawn` is a terminal administrative state before or after scheduling as policy permits |
| `cbtPaperVersions` | `schoolId`; exam/sitting; version; paper/section metadata | `draft` → `review` → `published` → `retired` |
| `cbtQuestionVersions` | `schoolId`; paper/version; author/reviewer; item type and scoring policy | `draft` → `review` → `published` → `retired` |
| `cbtRegistrations` | `schoolId`; exam/sitting; `studentId`; prerequisite `enrollmentId`; paper choices; eligibility decision; candidate snapshot | `draft` → `eligible` → `confirmed`; `withdrawn`, `disqualified`, and `completed` are controlled terminal or outcome states |
| `cbtCenters` and allocations, if in scope | `schoolId`; exam/sitting; center/room/device/seat; capacity | `draft` → `published` → `open` → `closed`; allocation itself: `unassigned` → `assigned` → `checked_in` → `released` |
| `cbtAttempts` | `schoolId`; registration; paper version snapshot; authenticated candidate/session where applicable | `not_started` → `active` → `submitted` → `finalized`; `expired` and `invalidated` are controlled terminal states |
| `cbtAnswers` | `schoolId`; attempt; question-version snapshot; answer payload; saved/final markers | `saved` → `final`; no update after attempt finalization except an explicit correction policy |
| `cbtResults` | `schoolId`; attempt/registration; scoring-policy version; score and grade snapshot | `pending` → `scored` → `moderated` → `approved` → `published`; `withdrawn` and `superseded` require an auditable correction or regrade path |
| `cbtIdempotencyRecords` and audit records | `schoolId`; actor/session; operation and request checksum | `reserved` → `completed` or `failed`; duplicate matching requests return the prior outcome, while checksum mismatches are rejected |

Every tenant-owned CBT row must carry `schoolId` or be explicitly documented as a platform-global immutable reference. Every relationship must validate that all referenced rows belong to the same school and compatible session/term/class context. Because the inspected schema showed no `references()` declarations, application-level validation and targeted database uniqueness remain necessary unless a deliberate foreign-key strategy is introduced.

At attempt start, persist the selected paper/question version and the candidate snapshot. At finalization, persist the scoring basis and final values needed to reproduce the released result. Do not let later edits to questions, grade scales, or live assessment rows silently change a published CBT outcome.

## Authorization and data-access rules

**Route authorization.** Every CBT query and mutation must run behind a narrow procedure built on the existing authenticated context and `accessSchool`. Candidate, teacher, invigilator, marker, reviewer, and publisher capabilities should be named separately. Owner/admin wildcard access may remain an administrative policy, but it should not be the only design for question-key access, marking, or publication. The existing role matrix grants teachers both `academics.write` and `results.write`; that is not sufficient evidence of assignment-scoped CBT authority.

**Candidate self-scope.** Student-facing procedures must derive the candidate from `ctx.user.id` and an active school membership, then resolve the linked `studentProfiles` row and registration. A client-supplied `studentId` is never an authorization substitute. If multiple profiles match a school/user link, return an explicit identity-resolution error rather than selecting the first row. Guardian reads must derive wards from verified `studentGuardians` relationships and include `schoolId` on the relationship and student predicates.

**Teacher and invigilator scope.** Teacher operations should require an active teacher membership, active `staffProfiles` record, and an explicit CBT assignment or a validated `classSubjects` relation for the relevant class and subject. Assignment removal, effective dates, co-teachers, and invigilator scope must be represented if they affect access. Do not expose answer keys or other classes through the broad teacher academic permissions currently evidenced.

**Administrative scope.** Exam configuration, paper publication, roster freeze, candidate correction, result approval, withdrawal, and publication require dedicated administrative or reviewer capabilities. Approval and publication should be separated from score entry unless the approved product policy explicitly permits a combined role. All such operations require confirmation or idempotency where repeated execution could change state.

**Data predicates.** Every select, update, delete, and upsert must include `schoolId` and the target identifier. Related IDs must be resolved together in a server-side transaction or resolver that verifies school, session, term, class, subject, enrollment, registration, and attempt relationships. Helpers that accept `schoolId` or actor IDs as ordinary arguments must not be treated as standalone authorization boundaries.

**Projection and confidentiality.** Use least-privilege DTOs. Candidate views may include identity, schedule, instructions, own attempt state, and own published outcome. Teacher views may include assigned operational data but not answer keys outside their authoring or review scope. Admin/reviewer views may include audit and moderation data according to policy. Do not return `medicalNotes`, unrelated guardian data, raw session metadata, answer keys, or internal audit metadata unless specifically required.

**State enforcement.** Every state transition must validate the current state, actor capability, exam window, attempt ownership, and relevant idempotency key. `submit`, `expire`, `invalidate`, `reopen`, `mark`, `approve`, `publish`, `withdraw`, and `regrade` must be server-owned and auditable. Finalized attempts and published results are immutable by default; corrections create a controlled new version or explicit replacement record.

## Result integration boundary

CBT attempts and answers must remain separate from the existing `scores` table. The existing `assessments` table can provide an academic assessment shell or reference if its term/class/subject semantics match the exam, but it cannot represent the CBT attempt, paper version, answer, timer, or finalization contract.

A CBT-to-results adapter should execute only after the attempt is finalized and the result passes candidate, enrollment, assessment, class, subject, term, score-range, grading-policy, and completeness checks. The adapter should write a versioned CBT result and, where the academic product requires it, produce an academic score through a controlled transaction. It must not write directly from an active attempt or accept a client-calculated mark.

The existing `resultPublications` approval-before-publication pattern is reusable as a release concept, but it requires a class-scoped and tenant-scoped contract. The inspected report-card query does not use publication `classId` to constrain all assessments, and published cards are computed from live records rather than a frozen snapshot. CBT integration should therefore publish a server-generated snapshot containing the candidate, class/term context, score, grade, weighting, grading-scale or calculation version, release state, and audit identifiers. Later grading-policy changes must not rewrite a previously published result without an explicit regrade and republication action.

Student and guardian portals should expose only published CBT outcomes through a dedicated DTO or a carefully extended published-results contract. Internal draft, scored, moderated, or withdrawn records must not leak through portal procedures. The existing `PortalResults` component is a presentation starting point, not evidence that CBT result semantics already exist.

## UI integration points

CBT should extend `client/src/pages/Home.tsx` rather than create a second global shell. Add a lazy-loaded CBT view to the existing `View`, navigation-group, sidebar, `Workspace`, and `Suspense` patterns. Use `InstitutionSwitcher` and clear selected CBT exam, attempt, draft answers, and cached queries after a tenant change. The active tenant must still be revalidated by every server request.

The first information architecture should distinguish, at minimum, the following experiences:

- **Student:** eligible exams, instructions and schedule, authenticated attempt, save/reconnect state, submit confirmation, and published outcomes.
- **Teacher or operational reviewer:** only assigned question authoring/review, candidate or submission queues permitted by policy, and no unrestricted answer-key or cross-class access.
- **Owner/admin or designated CBT administrator:** exam and paper configuration, roster and allocation controls, audit view, moderation, approval, and publication.

Reuse existing `SectionCard`, `PageHeader`, module toolbar, dialog, tabs, progress, alert, table, scroll-area, and accessible form primitives. Introduce semantic CBT status components for `draft`, `review`, `scheduled`, `live`, `submitted`, `marked`, `published`, `locked`, `expired`, and `disconnected` rather than adding scattered literal colors. The shell has mobile and reduced-motion conventions, but no CBT-specific viewport, timer, keyboard, screen-reader, reconnect, or dense-question interaction evidence exists; those require dedicated testing. The current dashboard is in-memory view navigation and has no evidenced URL route for deep links.

## Migration and testing strategy

### Migration strategy

Add CBT tables through the existing Drizzle schema export and ordered migration chain. Review generated SQL and migration metadata before applying it. Keep the first migration additive and avoid changing existing student, enrollment, class, or result semantics as a prerequisite for CBT.

Create tenant-aware indexes for candidate lookup, active attempts, expiry, registration status, exam scheduling, publication retrieval, and idempotency. Use composite uniqueness that includes `schoolId` where the business identity is tenant-local. If a database foreign-key strategy is not adopted, make same-school validation mandatory in focused database helpers and test every relation.

Do not backfill existing enrollments into CBT registrations without an explicit eligibility rule and a reviewed candidate-snapshot policy. Existing academic migrations import class and subject rows, not CBT exams, attempts, or results. When CBT imports are eventually needed, reuse preview, confirmation, checksum, transaction, audit, and idempotency patterns, and reject concurrent duplicate keys safely.

Use transactions for multi-row operations. Attempt start should create the registration binding, paper/question snapshot, attempt, and initial audit/idempotency record atomically. Finalization should atomically lock the attempt, persist final answers and scoring output, and create the pending result or integration event. Do not call external providers inside these transactions; persist a retryable internal state first if delivery is later required.

### Testing strategy

Testing should combine router authorization tests, focused database/helper invariant tests, and UI contract or browser interaction tests. The existing route tests often mock the database boundary, which verifies procedure policy but does not prove persistence invariants; CBT needs both levels.

Minimum server coverage should prove unauthenticated, invited, suspended, wrong-role, wrong-school, foreign-related-ID, inactive-teacher, unassigned-teacher, and candidate-self-scope rejection. It should cover session revocation, tenant switching, registration idempotency, duplicate start/submit, answer uniqueness, time-window and expiry behavior, reconnect retries, finalization immutability, paper-version snapshotting, assessment/enrollment/class/term consistency, score validation, approval/publication separation, result withdrawal/regrade, and portal isolation across two tenants and two classes.

Minimum database/invariant coverage should cover concurrent idempotency races, rollback after partial failure, cross-tenant relationship combinations, duplicate publication identity, finalized-attempt writes, and versioned published-result stability. Tests should not rely only on pre-read duplicate checks.

Minimum UI coverage should cover navigation visibility by capability, tenant-switch reset, candidate-owned data, keyboard and accessible labels, mobile drawer and dense question layout, timer and submission warnings, disconnected/reconnecting states, reduced-motion behavior, and answer-key exclusion from student payloads. Where interaction cannot be proven by source assertions, add real viewport/browser tests.

## Explicit Phase 1 exclusions

The following are excluded from the inspected Phase 1 architecture unless separately approved in the product contract:

1. **Production readiness, capacity, availability, and performance claims.** The inspection provides no load, concurrency, uptime, disaster-recovery, or deployment evidence.
2. **External verification and provider integration.** No external identity provider, SMS, email, WhatsApp, proctoring provider, device-management service, or examination authority integration is evidenced.
3. **Biometric identity verification, facial recognition, automated proctoring, and anti-cheating analytics.** These require separate legal, privacy, operational, and security decisions.
4. **Offline exam delivery.** The existing PWA shell does not cache NSOS API responses and is not evidence of offline attempt support. Reconnect behavior must be designed explicitly rather than assumed.
5. **A general academic-results rewrite.** CBT should use a narrow adapter and fix only the result invariants required for its boundary; it should not silently replace the existing academic grading model.
6. **A general teacher/staff permission redesign.** CBT requires narrower capability checks for its own operations, but broad existing academic and staff permissions are not comprehensively redesigned by this inspection.
7. **Open-ended parent/guardian conversation or broadcast communications.** Existing message logs and announcements are not a two-way CBT communication system and are not treated as delivery infrastructure.
8. **Advanced adaptive testing, uncontrolled randomization, item calibration, psychometric analysis, or multi-authority examination governance.** These are separate domain requirements unless the Phase 1 product contract explicitly includes them.
9. **Unbounded reporting, exports, or live analytics.** Any Phase 1 export or dashboard must be tenant-authorized, bounded, projected, auditable, and limited to defined operational needs.

## Unknowns requiring product and security decisions

- What exact CBT contract is intended: practice assessment, school examination, external examination, or a combination?
- Is Phase 1 objective-only, or does it include essay/manual marking, review, moderation, and partial credit?
- Are centers, rooms, devices, seats, check-in, and capacity part of the first release, or is the exam delivered to existing classes without physical allocation?
- What are the required exam-window, duration, timezone, late-start, pause, reconnect, re-entry, and expiry rules?
- Is candidate identity established only through the authenticated student account, or are check-in, identity documents, invigilator verification, or another control required?
- Which existing school roles may author, review, invigilate, mark, approve, publish, withdraw, or regrade? Is a dedicated CBT role or assignment model required?
- Which students are eligible, and which evidence controls eligibility: active enrollment, class, subject, fee status, accommodations, manual approval, or an imported roster?
- What candidate snapshot fields and accommodations must be frozen at registration and attempt start, and what retention/deletion rules apply?
- How are questions authored, reviewed, versioned, selected, ordered, randomized, and protected from answer-key disclosure?
- What scoring, weighting, grading scale, pass/fail, negative marking, rounding, and regrade rules apply? Which values must be persisted in a released snapshot?
- Should CBT produce a new result type, extend existing assessments, or only produce a pending academic score through the adapter?
- What does “published” mean for students and guardians, and can a result be withdrawn or superseded after publication?
- What are the expected concurrency, timer-authority, autosave, retry, and recovery requirements? These are unknowns, not capacity claims.
- What source data, import format, rollback policy, and tenant-by-tenant migration sequence are required?
- What legal, privacy, accessibility, retention, audit, and examination-integrity requirements govern candidate data, answers, question banks, and publications?
- Does the current schema/migration policy permit new explicit constraints or require application-enforced same-school invariants for all CBT relationships?

## References

The references below identify the inspected repository evidence. They are local repository paths rather than external verification sources.

[1]: file:///home/ubuntu/nsos/server/roles.ts "School roles and permission matrix"
[2]: file:///home/ubuntu/nsos/server/routers/nsos.ts "Tenant-scoped NSOS procedures and route authorization"
[3]: file:///home/ubuntu/nsos/server/db/core.ts "NSOS database helpers, transactions, migrations, portals, and results"
[4]: file:///home/ubuntu/nsos/drizzle/schema/core.ts "NSOS Drizzle schema"
[5]: file:///home/ubuntu/nsos/client/src/pages/Home.tsx "NSOS dashboard shell and workspace composition"
[6]: file:///home/ubuntu/nsos/client/src/components/AcademicClassSetup.tsx "Academic class setup and timetable UI"
[7]: file:///home/ubuntu/nsos/client/src/components/PortalResults.tsx "Published portal results presentation"
[8]: file:///home/ubuntu/nsos/server/grade-calculations.ts "Percentage and grade calculation helpers"
[9]: file:///home/ubuntu/nsos/server/auth.ts "Authentication and session flows"
[10]: file:///home/ubuntu/nsos/server/_core/sdk.ts "Request authentication and active-session checks"
[11]: file:///home/ubuntu/nsos/drizzle/0001_cute_solo.sql "Publication schema migration history"
[12]: file:///home/ubuntu/nsos/server/nsos.operational-routes.test.ts "Focused operational results route tests"
[13]: file:///home/ubuntu/nsos/server/nsos.academic-migration-routes.test.ts "Academic migration route tests"
[14]: file:///home/ubuntu/nsos/server/nsos.student-migration-routes.test.ts "Student migration route tests"
[15]: file:///home/ubuntu/nsos/server/nsos.staff-migration-routes.test.ts "Staff migration route tests"
[16]: file:///home/ubuntu/nsos/server/multi-institution-routes.test.ts "Tenant and multi-institution route tests"
[17]: file:///home/ubuntu/nsos/server/nsos.policies.test.ts "Role and permission policy tests"
[18]: file:///home/ubuntu/nsos/server/nsos.guardian-portal-invitation-routes.test.ts "Guardian portal invitation route tests"
[19]: file:///home/ubuntu/nsos/client/src/components/ui/sidebar.tsx "Reusable desktop and mobile sidebar primitives"
[20]: file:///home/ubuntu/nsos/client/src/index.css "NSOS theme, dark-mode, and reduced-motion styles"
