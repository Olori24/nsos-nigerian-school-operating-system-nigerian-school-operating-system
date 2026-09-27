# NSOS School Success Loop Architecture

**Date:** 26 September 2026
**Scope:** Additive owner command-centre increment based on the reviewed School Success Loop brief.

## Delivery status

- **Code complete:** the School Operator now includes an evidence-first School Success Loop surface built from the existing tenant-scoped workspace payload.
- **CI/source verification:** 121 Vitest files passed with 445 tests passing and 2 intentional skips. TypeScript, lint, production build, formatting, and diff checks also passed.
- **Deployed:** managed checkpoint `2709c9aa` was published to the existing NSOS project, followed by the tracker/readiness checkpoint `02b038ad`.
- **Live verified:** `https://nsos.top/` returned HTTPS 200, `https://www.nsos.top/` returned an HTTPS 301 to the platform root, and one published school route returned HTTPS 200. The focused School Success Loop, School Operator, website routing, and draft-preview suite passed 27/27.

The read-only website aggregate observed four website records, two published websites, and no active or pending custom domains. The platform's custom-domain architecture remains present and covered by route regression tests, but this release does not claim that a school-owned subdomain is currently configured.

The public website route initially returned a 500 response because the managed database lacked the tracked nullable `schoolWebsites.websiteContent` column. The reviewed additive migration was applied, after which the public API returned 200 and the published OAE Academy page rendered. The serializer was also corrected to return a minimum-necessary public allowlist rather than internal website or domain-verification fields. The change did not alter website content, DNS, MX, sender configuration, provider settings, or school records.

## Retention principle

NSOS should become the school's daily operating surface, not only a records system or website. The operating loop is:

> **RECORD → UNDERSTAND → REVIEW → ACT → MEASURE → RETURN**

The current increment implements the **understand/review/return** surface. It reads existing evidence, presents protected destinations, and leaves every consequential action to the existing role-gated workflow.

## Daily owner rhythm

The School Success Loop presents:

- current admissions waiting for review;
- recorded outstanding balance for finance follow-up;
- attendance below the existing review cue;
- the first open evidence-backed operational attention item;
- stable-versus-review signal counts;
- morning, during-day, and close-of-day review rhythm;
- academy launch readiness as configuration evidence only.

Every card hands off to an existing protected destination. The component does not create records, send communications, publish websites, enrol learners, issue credentials, change fees, change providers, or run background work.

## Planned retention layers

These are architecture directions, not claims that all layers are delivered by this increment.

### Parent and communication loop

Use a tenant-scoped communication intent and delivery history model for attendance notifications, fee reminders, admissions updates, academic updates, announcements, event reminders, and parent forms. Each intent should include audience scope, consent/legal basis where relevant, content version, actor, approval state, provider attempt, delivery outcome, and audit reference. WhatsApp/email delivery remains provider-specific and confirmation-gated; no automatic consequential outbound message is implied by an insight.

### Admissions CRM

Extend the existing admissions records toward:

> **ENQUIRY → FOLLOW-UP → VISIT → APPLICATION → REVIEW → DECISION → ENROLMENT**

Track an assignee, explicit status, UTC timestamps, next follow-up, source/referral, communication history, and conversion outcome. Do not fabricate leads or make automated admissions decisions. Public enquiries must remain tenant-scoped and applicant review stays protected.

### Institutional memory

Use the existing private operating-memory boundary as the first layer. Future approved documents, policies, calendars, templates, goals, historical evidence, and approved website content should be stored as typed, permissioned records or private file metadata under `schoolId`. Retrieval must enforce school membership and role permissions before any explanation is produced. Do not create a second CMS or copy private website data into an unrelated knowledge store.

### Weekly executive brief

Build a deterministic, evidence-first aggregation over attendance, admissions, finance, communications, website activity, unresolved attention items, academy readiness, and operational trends. Every metric must carry a source and period. Empty or unavailable data must remain explicit. No invented metrics, predictive claim, or automatic distribution should be introduced without a separately approved workflow.

### Annual school cycle

Model the eventual session lifecycle as an ordered, reviewable sequence:

> **NEW SESSION → CLASS PROMOTION → ADMISSIONS → FEES → CALENDAR → STAFF → TEACHING → ASSESSMENT → REPORTS → CERTIFICATES → ARCHIVE**

Each transition should have an owner, evidence checklist, timestamp, role gate, and explicit confirmation. The sequence must not silently promote learners, issue credentials, charge accounts, publish results, or archive records.

## Website and operations boundary

The public school website should consume approved, published school content through the existing website content system rather than a second CMS. Future shared content types are news/events, programmes, FAQs, announcements, admissions settings, school contact information, and approved content blocks. Public serializers must continue to expose only published, allowlisted fields; operational records, unpublished drafts, private documents, and tenant-internal identifiers remain excluded.

## Safety invariants

- No unattended autopilot or background consequential action.
- No automatic grading, credential issuance, payments, enrolment, or public publishing.
- No automatic provider, DNS, sender, or domain changes.
- Tenant isolation and server-side role gates remain mandatory.
- Outbound communication is tenant-scoped, auditable, consent-aware where applicable, and confirmation-gated.
- Insights are explainable review cues, not decisions or predictions.
- Rate limits, audit history, and minimum-necessary data remain required for future layers.

## Verification plan

Before calling this work deployed, verify:

1. focused School Success Loop and School Operator regressions;
2. full TypeScript, Vitest, lint, build, formatting, and diff checks;
3. managed checkpoint identifier;
4. the live NSOS platform root and `www.nsos.top` redirect;
5. school website routing and existing school subdomain architecture;
6. HTTPS/TLS and responsive rendering at mobile and desktop sizes;
7. existing school website editor, draft, and publish workflow;
8. no change to email DNS/MX records.


## Public school website privacy verification — 2026-09-27

The public website serializer now uses an explicit response allowlist rather than spreading tenant database rows into anonymous responses. Public responses expose only school identity needed by the public site and explicitly approved website presentation/contact content.

Excluded from anonymous responses include tenant identifiers, custom domains, DNS verification tokens, internal domain/publication status, internal school metadata, and unrelated operational fields. Public media is represented by the resolved logo/hero URLs rather than internal media identifiers.

Regression coverage is maintained in `server/public-website-privacy.test.ts`, including forbidden-field assertions and the public admissions route contract. The change is isolated to serialization; database schema and tenant records are unchanged.
