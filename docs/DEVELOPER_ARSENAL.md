# NSOS Developer Arsenal

> CTO operating standard for building NSOS with reusable, production-grade engineering assets instead of reinventing commodity infrastructure.

## Mission

NSOS should spend engineering effort on education-domain differentiation, not on repeatedly rebuilding commodity capabilities.

The Developer Arsenal is therefore a decision system, not a bookmark list. Every adopted dependency, repository, API, template, or service must earn its place through maintainability, license compatibility, security, integration cost, operational fit, and user value.

## Current NSOS baseline

- React 19 + Vite
- TypeScript 5.9
- Node.js 22
- Express 4
- tRPC 11
- Zod validation
- Drizzle ORM
- MySQL/TiDB-compatible persistence
- S3-compatible object storage
- Vitest
- ESLint + Prettier
- GitHub Actions CI

The existing CI already gates install, production dependency audit, lint, formatting, typecheck, migrations, tests, and production build. This arsenal layer adds security and supply-chain gates without replacing those controls.

## Arsenal layers

| Layer | NSOS use | Default policy |
|---|---|---|
| UI | accessible primitives, data tables, forms, command interfaces, charts | Prefer existing primitives before creating new ones |
| APIs | payments, messaging, maps, geodata, identity, education data | Provider abstraction; never hard-wire business logic to a vendor |
| Backend | queues, jobs, storage, caching, search | Reuse stable infrastructure; keep domain rules server-authoritative |
| AI | model SDKs, structured output, evaluations, RAG, agent patterns | AI proposes; deterministic code validates and controls execution |
| Automation | workflows, webhooks, scheduled jobs | Idempotent, observable, permission-aware execution |
| Security | CodeQL, dependency review, secret scanning, dependency updates | Security gates run before production delivery |
| Testing | unit, integration, contract, E2E, load | Test business invariants, permissions, destructive boundaries and critical journeys |
| DevOps | CI, deployment, health checks, backups, observability | Reproducible builds and recoverable operations |
| Documents | PDF, CSV, spreadsheet and import/export utilities | Validate files at the boundary; never trust client metadata |
| Nigeria/Africa | curriculum, geography, local payments, communications, localisation | Keep country-specific rules behind explicit adapters |

## Adoption score

Every candidate resource is scored before production adoption:

- Maintenance and release health: 10
- Production maturity: 10
- Documentation: 10
- License compatibility: 10
- Security posture: 10
- Integration fit: 10
- Performance: 10
- Operational complexity: 10
- Cost: 10
- Exit/alternative path: 10

**90–100:** production arsenal  
**75–89:** approved with normal review  
**60–74:** selective/reference use  
**<60:** do not introduce into production

## Reuse rule

For every new feature:

1. Search the Arsenal.
2. Check whether NSOS already has the capability.
3. Check whether a maintained open-source implementation is suitable.
4. Check the license and security posture.
5. Compare build-vs-reuse cost over 12 months.
6. Adopt behind an internal abstraction when vendor lock-in would hurt.
7. Add tests around the NSOS-specific behaviour.
8. Record the decision when the component becomes architectural.

## Non-negotiable CTO rules

### 1. Domain code stays ours

Admissions, enrolment, attendance, grading boundaries, fee rules, tenant isolation, approvals, audit semantics, and institutional workflows are NSOS intellectual property. Open-source components may provide infrastructure or primitives, not replace the domain model without a deliberate architecture decision.

### 2. License before code

No repository is copied or adapted until its license is understood. GPL/AGPL and other reciprocal licenses require explicit legal/architecture review before entering a proprietary deployment.

### 3. Security before convenience

A package with a beautiful demo but weak maintenance or unsafe defaults is not an approved dependency.

### 4. AI remains supervised

Models may draft, classify, explain, recommend, transform and prepare structured plans. They do not receive implicit authority to mutate high-impact institutional state.

### 5. Provider isolation

Payments, messaging, storage, AI, email and other external providers must sit behind explicit service boundaries so NSOS can replace providers without rewriting the school domain.

### 6. Cost is an engineering requirement

Every external service must have a known free-tier/low-cost path, a usage ceiling where practical, and a migration/exit plan.

## Security arsenal deployed

The NSOS branch now adds a dedicated security workflow covering:

- CodeQL static analysis
- Pull-request dependency review
- Gitleaks secret scanning
- scheduled security execution

The existing CI remains responsible for application correctness and production build verification.

## Definition of Done

A production feature is not done because the UI works.

It is done when the feature has:

- server-side authorization
- tenant isolation where applicable
- input validation
- audit semantics for consequential actions
- deterministic failure behaviour
- idempotency where retries are possible
- tests for critical rules
- security scanning coverage
- migration/recovery consideration
- performance consideration
- accessible UI
- documented operator behaviour
- cost/provider implications understood

## Build priority for NSOS

The arsenal should be deployed in this order:

1. **Security and supply chain** — CodeQL, dependency review, secret scanning, dependency hygiene.
2. **Testing confidence** — critical-path E2E, permission matrix tests, API/contract coverage.
3. **Observability** — structured errors, health/readiness, operational metrics, audit visibility.
4. **Performance** — bundle analysis, query profiling, caching where evidence supports it.
5. **Reusable UI** — shared data-heavy primitives and accessible interaction patterns.
6. **Automation** — idempotent jobs, queues, retries, webhooks and scheduled operations.
7. **AI engineering** — structured outputs, evaluation fixtures, model/provider abstraction and cost telemetry.
8. **Nigeria/Africa adapters** — payments, communications, geography, localisation and institution-specific rules.
9. **Client delivery** — backup/restore evidence, release notes, runbooks and handover artifacts.

## CTO objective

Every sprint should increase at least one of these ratios:

**value delivered / engineering hour**

**client value / infrastructure cost**

**reliability / operational complexity**

**security / attack surface**

If a new dependency does not improve one of these ratios, it needs a strong reason to exist.
