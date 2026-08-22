# NSOS Single-Prompt Online School Launcher

## Purpose

The **Single-Prompt Online School Launcher** lets an owner or administrator describe a proposed online learning offer in ordinary language. NSOS converts that brief into a visible, editable, tenant-scoped internal launch plan. After a single explicit approval, it can create a **draft-only** learning foundation and report whether the internal configuration is ready for the next human-reviewed step.

> The launcher is an internal setup accelerator, not an autonomous public-school publisher, payment system, enrolment engine, or credential issuer.

## Selected mode: private launch and configuration validation

The selected initial mode operates only within the active institution. It does not create a second school, copy an institution, or generate demo people. The owner receives a coherent launch foundation in the current tenant and a durable job record demonstrating exactly what NSOS created and what it deliberately did not create.

| Area | Launcher may create after owner/admin approval | Launcher never creates or activates |
|---|---|---|
| Learning offer | One internal **draft** programme, ordered draft modules, human-reviewed draft milestones, and internal text materials | Public course pages, learner enrolments, completion, grading, certificates, credentials, or claims of accreditation/outcomes |
| AI value preparation | A bounded tutor configuration brief and monetisation discussion prompts for human review | An AI tutor account, paid plan, billing, revenue claim, pricing activation, bank details, or provider credentials |
| Public presence | Private, editable website-copy recommendation in the job plan | Website save, publication, admissions exposure, domain connection, DNS change, contact claims, or advertising spend |
| Test validation | A configuration-readiness result based only on the records created by the same job | Fabricated learners, guardians, staff, reviews, testimonials, applications, attendance, payments, invoices, messages, credentials, or public content |

## Single-prompt interaction

The owner may write one comprehensive prompt, for example:

> “Set up a self-paced online training programme in practical digital skills for adult beginners. Prepare a concise starter curriculum, facilitator materials, a human-supervised AI tutor brief, and a private launch checklist. Do not publish it or create learners.”

NSOS responds with a compact launch plan containing the proposed programme title, delivery mode, audience wording, internal modules, milestones, materials, AI-tutor boundary, monetisation preparation themes, setup steps, and limitations. The plan is **not a completed launch** until the owner uses the explicit `Approve and run` control.

## Execution boundary

The launcher uses a typed executor, not model-authored actions. The model can generate only a strict structured plan and a bounded course blueprint. Server code validates the output, strips unsupported claims, requires active owner/admin membership, applies shared rate limits, records privacy-safe audit events, and calls the existing transaction-backed Course Studio draft writer.

The executed result may reference the created programme and count of internal modules, milestones, and materials. It must also state that the programme remains draft-only and that no person, money, public content, communication, provider, or credential state was changed.

## Configuration-readiness validation

The selected private validation mode is intentionally **not mock data generation**. It verifies only whether the single approved run created a coherent internal configuration:

| Check | Pass condition |
|---|---|
| Tenant scope | Every created programme, module, milestone, and material belongs to the active institution. |
| Draft state | The programme and all generated learning records remain draft-only. |
| Reviewable structure | At least two modules, at least one milestone per module, and at least two internal materials were saved. |
| No unsafe side effects | The job created no learner, guardian, staff, admission, invoice, payment, receipt, notification, message, provider, domain, credential, or public website record. |
| Handoff clarity | The result points to Learning Operations for review and separate activation, and to the existing tutor/website workspaces only when the owner chooses those next steps. |

## Monetisation boundary

The launcher can help an owner prepare monetisable learning value by producing a course foundation, internal materials, a tutor-scope brief, and human-review prompts for later pricing and delivery decisions. It must not claim or imply that NSOS has created revenue, collected money, found learners, guaranteed outcomes, configured payment processing, or launched a public offer. Pricing, payment-provider configuration, fee activation, public publication, advertising, and commercial communications remain in their separate confirmed workflows.

## Failure and recovery

An execution is idempotent per automation job. If the internal course writer cannot complete its transaction, the job is marked failed with a privacy-safe recovery instruction and **does not retry automatically**. The owner can review the targeted workspace and create a new job only after addressing the disclosed conflict or input issue.
