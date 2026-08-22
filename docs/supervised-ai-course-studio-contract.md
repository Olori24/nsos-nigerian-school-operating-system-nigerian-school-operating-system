# Supervised AI Course Studio Contract

**Purpose.** Course Studio helps an owner or administrator describe a learning offer in ordinary language and receive an **editable internal draft** for an approved learning organisation. It supports schools, vocational institutes, coaching centres, online training providers, and hybrid operators. It is designed to shorten foundation setup, not to bypass educational, operational, or safeguarding review.

## Five-minute Learning Centre foundation

The guided foundation is intentionally narrow. The owner supplies a learning goal, audience level, delivery mode, estimated duration, and any organisation-approved constraints. The agent then proposes a programme title and description, an internal delivery model, a small ordered module outline, reviewable learning milestones, a suggested tutor-material pack, and the next protected operational workflow.

| Within the five-minute foundation | Deliberately outside it |
|---|---|
| An editable internal programme and curriculum outline | Public course publication or website changes |
| Suggested module types for academic, vocational, coaching, or online delivery | Automatic enrolment, learner/staff account creation, or guardian linking |
| Suggested tutor-material formats such as lesson guide, practice activity, worksheet outline, project brief, or discussion prompt | Generation of unsafe instructions, regulated professional advice, or guarantees of competence |
| A clear review path into existing programme, module, and milestone controls | Automatic persistence, activation, assessment, grading, result publication, certificate issuance, or completion confirmation |
| Role-safe next questions and stated limitations | Messages, invitations, invoices, payment collection, provider configuration, DNS, or credential changes |

## Structured draft contract

Course Studio uses a strict server-side structured response. It returns only bounded text and allowed internal classifications.

| Field | Contract |
|---|---|
| `courseTitle` and `courseSummary` | Editable internal course positioning; no people, performance guarantees, accreditation claims, or public marketing claim. |
| `deliveryMode` and `durationLabel` | One allowed internal delivery mode and a human-readable duration suggestion. |
| `modules` | At most six ordered, editable internal module proposals. Each uses an allowed learning type and a safe description. |
| `milestones` | At most four ordered internal checkpoints per module. They are not grades, credentials, certificates, or automatic completion events. |
| `tutorMaterials` | At most six material outlines, such as facilitator guide, practice exercise, project brief, discussion prompt, reflection prompt, or resource checklist. No material is automatically delivered or published. |
| `setupRecommendation` | A role-permitted next step that points only to an existing protected NSOS workflow. |
| `limitations` | Explicit boundaries, dependencies, and any information the agent cannot infer safely. |

## Niche coverage without fabricated expertise

The agent can draft structures for many educational and skills niches, including school enrichment, academic tutoring, literacy, exam preparation, coding, design, fashion, agriculture, business skills, languages, arts, employability, and practical workshops. It must use the owner’s stated purpose and organisation-approved context. It does not claim official curriculum alignment, professional accreditation, legal/regulatory approval, medical safety, job placement, examination success, or skill certification unless an authorised human later supplies and reviews verifiable evidence through an appropriate workflow.

## Security, tenancy, and approval gates

Every Course Studio request is scoped to a verified owner/admin membership and the selected institution. The model receives only safe aggregate context such as operating type, programme count, active curriculum counts, and role-permitted destinations. It receives no learner names, guardian information, provider credentials, message content, bank details, payment records, raw admission files, or another institution’s data. Requests are rate-limited, audit-recorded without prompt text, model output is schema-validated and allowlisted, and a deterministic fallback is returned whenever the model response is unusable.

> **Non-negotiable rule:** Course Studio prepares an editable internal draft. A human must explicitly review and confirm every programme, module, milestone, progress, tutor, website, provider, communication, finance, or public action in its existing protected workflow.
