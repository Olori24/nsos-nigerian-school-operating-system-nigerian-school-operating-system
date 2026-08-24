# One-Prompt Institution Builder Operating Model

## Product purpose

The NSOS **One-Prompt Institution Builder** converts an owner or administrator’s high-level description of a learning organisation into a private, editable institution blueprint. It serves schools, vocational training centres, coaching centres, online training providers, hybrid learning providers, and corporate academies.

The builder shortens the path from an idea to a reviewable operating foundation. It does not replace the organisation’s accountable education, safeguarding, finance, admissions, communications, or publication decisions.

> **Product principle.** One prompt prepares one private institution blueprint. It does not autonomously create a public institution, a student population, a financial offer, or an outcome claim.

## First-release blueprint

| Blueprint area | What NSOS prepares | What remains separate |
|---|---|---|
| Institution identity | Editable name suggestion, tagline, description, mission, vision, target learners, and positioning. | Legal name, registration, public identity, claims, contacts, and publication approval. |
| Learning foundation | One draft programme with internal modules, human-reviewed milestones, and plain-text internal materials through the existing Course Studio contract. | Activation, cohorts, instructor assignments, learner enrolment, graded assessments, completion, and credentials. |
| Website starter | Editable unpublished headline, introduction, programme callout, and FAQ starter. | Website application, owner review, publication, media, domain connection, DNS, and public admissions visibility. |
| Admissions readiness | Suggested owner decisions and direct access to the existing admissions workspace. | Applications, applicant data, review, acceptance, enrolment, guardian records, and messages. |
| Pricing readiness | A non-price-specific delivery and value-model prompt, plus finance decisions for the owner. | Fee amounts, activation, invoices, payment collection, receipts, provider configuration, and bank-account changes. |
| Lifecycle handoffs | Direct routes into Learning Centre, Website Studio, Admissions, Finance, Communications, and supervised AI Tutor configuration. | Any action owned by those separate protected workflows. |

The raw owner prompt is used only to construct the private blueprint. It is not retained in the operational audit metadata. The blueprint is scoped to its `schoolId`, and the server validates membership and owner/administrator authority on every list, detail, edit, and application procedure.

## AI planning contract

The structured planner is limited to a concise, reviewable JSON concept. It sanitises unsupported language including accreditation, certification, guarantee, ranking, percentage, job-placement, examination-success, and qualification claims. It rejects incomplete model output and uses a guided fallback instead.

The builder then delegates the learning foundation to the existing Course Studio contract, which produces an editable internal programme, modules, milestones, and materials. No unrestricted web research, personal data, staff identity, learner record, contact detail, price, bank information, provider secret, testimonial, review, or outcome claim is required or accepted as part of the prompt.

## Review and application lifecycle

| State | Meaning | Permitted action |
|---|---|---|
| `prepared` | The private blueprint is available to owners and administrators for review and edits. | Edit the visible summary fields, start a new version, use a protected handoff, or approve the narrowly bounded internal learning application. |
| `applying` | A confirmed single application is creating the existing internal learning foundation. | Refresh and wait for the result. The state prevents concurrent application. |
| `applied` | One inactive internal programme, draft modules, human-reviewed milestones, and internal materials were created. | Open Learning Centre and use its independent review and activation controls. |

Edits require an explicit confirmation and affect only the private blueprint. Applying a blueprint requires a separate explicit confirmation, a mutation rate limit, and an atomic status claim. A failed application returns the blueprint to `prepared`; it does not retry autonomously.

## Hard boundaries

> **Applying a blueprint creates only an inactive internal learning foundation.** It does not publish a website, make a domain or DNS change, create a contact, create an account, invite staff, admit or enrol a learner, send a message, activate a fee, create an invoice, collect a payment, change a provider, grade an assessment, mark progress, complete a learner, issue a private record or certificate, or produce a public credential.

The builder does not assess individual student performance, identify weak students or courses from personal data, make an employment or compliance decision, or send lifecycle notifications. Those capabilities require separately designed, role-scoped, data-minimised workflows and their own user approval.

## Audit and tenant isolation

Each meaningful builder action records a tenant-scoped security event with safe metadata: model or fallback source, confirmation requirement, draft counts, and declared non-effects. Audit events do not include the raw prompt or free-text edit values.

The builder list and detail endpoints query by `schoolId`, and the application helper rechecks the same tenant boundary before creating a programme. A user who is not an active owner or administrator is rejected before planning, persistence, editing, or application activity begins.

## Owner rollout sequence

An owner starts by describing the institution in ordinary language. They review the generated blueprint and may edit its visible identity and flagship-programme summary, or start a separate new version. They then make one conscious choice: apply the private learning foundation, or follow an individual handoff to review website, admissions, finance, communications, or supervised tutor configuration.

This sequence keeps the platform simple without concealing consequential institutional decisions behind a single button.

## Validation note

The public first-setup shell was checked at desktop and narrow mobile widths after the builder navigation integration. The unauthenticated shell remained readable and responsive. The builder itself is intentionally owner/admin-only, so its protected controls are covered by focused router and interface regressions rather than exposed in the public first-setup view.
