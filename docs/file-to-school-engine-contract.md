# File-to-School Engine Contract

## Purpose

The **File-to-School Engine** helps an owner or administrator transform owner-authorised learning material into a **private, reviewable educational knowledge model**. It is designed for an institution that has notes, an existing course extract, a transcript, a spreadsheet of topics, or a small text source but does not yet have a structured programme design.

> **Approved source → private extraction → provenance-aware analysis → owner review → separately protected Course Studio or Institution Builder action.**

The engine is an institutional planning tool. It does not automatically create a live school, publish a page, admit a learner, grade work, complete a learner, issue a credential, price an offer, collect money, send a message, run a campaign, or make an external change.

## Initial supported source formats

The first release is deliberately **text-first**. It stores the original uploaded text artifact in tenant-scoped object storage and stores only metadata, extracted plain text, and structured analysis records in the database.

| Source format | First-release handling | Analysis status |
| --- | --- | --- |
| Pasted description or notes | Supported as an approved private text source. | Analysed after confirmation. |
| `.txt` | Supported. The original text file is retained privately and its text is extracted. | Analysed after confirmation. |
| `.md` / `.markdown` | Supported. The original text file is retained privately and its text is extracted. | Analysed after confirmation. |
| `.csv` | Supported for a small, text-based topic/resource table. Cells are normalised into a bounded private text source. | Analysed after confirmation. |
| Transcript text | Supported when supplied as plain text. | Analysed after confirmation. |
| PDF, DOCX, PPTX, audio, video, images, or web pages | **Not parsed in this release.** The engine must not claim that it extracted text, pages, slides, timestamps, facts, or metadata from these formats. Owners may provide an authorised text extract or transcript through the supported path. | Requires a future reviewed extraction workflow. |

This is a format statement, not a claim that a supported source is factually verified, complete, current, pedagogically appropriate, or legally reusable. The owner remains responsible for authorisation, accuracy, licensing, and final instructional use.

## Knowledge library record

Every tenant-private source has a durable library record with the following bounded attributes.

| Attribute | Purpose | Privacy rule |
| --- | --- | --- |
| Source title and format | Lets the owner recognise the material. | Tenant-scoped; not public. |
| Original object-storage key | Retains a supported uploaded text artifact outside the database. | Never exposed through public content or audit metadata. |
| Extracted text and immutable revision snapshots | Preserves the exact owner-approved material used for each analysis while the current source can be updated. | Visible only in the authorised owner/admin review workspace. |
| Source fingerprint and revision number | Supports update awareness and provenance. | Does not reveal raw text in logs or audits. |
| Structured analysis | Contains bounded topics, gaps, objectives, project directions, course/offer/website readiness, and quality questions. | No raw source text in analysis metadata or audit events. |
| Derived-draft links | Records which private planning drafts were prepared from a source revision. | It is a review cue, not proof of publication or learner delivery. |

Deleting a source requires explicit confirmation and removes its retained analysis and lineage records from the private library. The object may become unreachable after its database reference is removed; the storage service does not offer a separate deletion endpoint.

## Provenance model

The engine distinguishes four labels whenever it produces a planning or course-draft recommendation.

| Label | Meaning | Owner decision required |
| --- | --- | --- |
| **Source-based** | A recommendation grounded in the owner-approved source revision. | Confirm the source is accurate and sufficiently complete. |
| **AI-expanded educational content** | A pedagogical explanation, example, exercise, scenario, question, project, or progression created to make source material teachable. | Confirm it preserves the intended meaning and is appropriate for learners. |
| **External / verified information** | A future source-backed expansion from a separately selected, reviewable reference. | Confirm the reference, currentness, licence, and claim. The first release does not silently add external research. |
| **AI-suggested content** | A proposed gap, outcome, audience question, course direction, offer direction, or improvement action not asserted as present in the owner source. | Confirm, edit, remove, or supplement it before use. |

No generated content may present an AI suggestion or external fact as if it appeared in the owner source. The engine must flag gaps, contradictions, prerequisites, uncertainty, and specialist-review needs instead of silently resolving them.

## Course and quality planning

The engine can prepare a private outcome-first course recommendation containing a title, target-learner questions, prerequisites, outcomes, module direction, lesson/material suggestions, non-graded exercises, project ideas, resources to review, and provenance markers. It can also prepare a **quality-review rubric** covering completeness, structure, objectives, practical value, non-graded assessment alignment, difficulty progression, source coverage, factual-confidence questions, and accessibility.

Any numeric readiness indicator is only a **private planning cue**. It is not a proof of academic quality, factual correctness, accessibility, accreditation, curriculum approval, learner outcome, employability, certification, or fitness for public release. A score never unlocks publishing and never replaces human review.

## Owner control and protected handoffs

The owner can inspect a source, update a source by creating a new revision, review knowledge gaps, request an improvement recommendation, prepare a private Institution Builder blueprint, or open existing protected Course Studio, Learning Centre, Website, Advertising, and supervised-tutor workspaces. Each destination retains its own server-side tenant scope, membership, role, confirmation, rate-limit, audit, and publication controls.

The engine does **not** automatically apply a programme, create a module, save a lesson, activate a tutor, publish a site, set a price, create a campaign, create a lead, send a message, enrol a learner, record an assessment, calculate a score, grade, pass/fail, complete, issue a private record, issue a public certificate, alter a provider, alter a domain, or schedule work.

## Learning integrity and personal-data limits

Owners must not upload passwords, API keys, payment or bank data, personal identity records, guardian/student records, raw learner submissions, grades, attendance evidence, or assessed work. The engine must not infer individual learner ability, readiness, risk, eligibility, completion, employment prospects, or career outcomes.

Instructor, subject-matter, accessibility, safeguarding, and jurisdiction-specific review remain required where the source or proposed activity warrants them. This contract does not establish accreditation, regulatory approval, copyright clearance, or professional advice.
