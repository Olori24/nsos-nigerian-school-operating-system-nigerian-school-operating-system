# Knowledge-to-Business Engine Contract

## Purpose

The **Knowledge-to-Business Engine** lets an owner or administrator begin with their own expertise, a practical idea, structured notes, existing course material, a transcript, or approved text. It produces a **tenant-private, reviewable analysis** of the learning opportunity and a bounded path into existing NSOS Builder, Learning Centre, Website, Admissions, Finance, Advertising, and supervised-tutor workflows.

> **Bring approved knowledge → inspect a private analysis → review a learning and offer foundation → explicitly approve separate protected workflows.**

It is not a public publishing tool, an automatic course launcher, a sales agent, a credential issuer, a learning assessor, or a background automation system.

## V1 input scope

The first delivery accepts owner-entered plain text representing a simple description, expertise notes, structured notes, an existing course extract, or an audio/video transcript. It is deliberately text-first so the owner can inspect exactly what is being analysed. A later file-ingestion phase may add owner-authorised TXT/Markdown uploads and carefully parsed document, audio, website, and video inputs only after content-extraction, licensing, malware, privacy, and storage controls are separately reviewed.

The owner must provide only material they own or are authorised to use. They must not enter student records, guardian data, assessment submissions, passwords, provider credentials, bank/payment information, protected examination content, or confidential third-party material. Raw source text is never placed in audit metadata.

## Private analysis contract

Every analysis is scoped to one `schoolId` and is visible only to an active owner or administrator of that institution. It captures a small structured record:

| Analysis output | Intended use | Explicit boundary |
| --- | --- | --- |
| Expertise and themes | Describe owner-approved knowledge areas and possible topics. | Not a professional qualification, accreditation, or claim of expertise. |
| Concepts and learning objectives | Suggest coherent, outcome-first internal learning goals. | Not a curriculum approval, assessed outcome, or completion decision. |
| Difficulty and prerequisite cues | Flag owner-review questions about sequencing or gaps. | Not an individual learner placement, diagnosis, risk label, or adaptive performance model. |
| Programme and project ideas | Suggest private programme, project, and practice foundations. | Not a created programme, material, assessment, portfolio, credential, or public offer. |
| Offer and website readiness | Suggest private positioning, an offer-ladder direction, and public-copy review questions. | Not a price, guarantee, public claim, campaign, lead, message, spend, or published website. |
| Quality review cues | Flag duplicate, missing-prerequisite, source, accessibility, and factual-review questions. | Not an autonomous quality verdict or automatic content rewrite. |

The analysis uses structured output with bounded text, controlled vocabulary, validation, fallback handling, shared rate limits, and a privacy-safe audit event. It is on-demand only: no timer, polling loop, automatic refresh, notification, message, or external request is created.

## Approval and application model

The engine may prepare a private learning-and-business foundation that the owner can open in the existing Institution Builder. The owner must explicitly confirm before any durable Builder blueprint is created from an analysis. Existing Builder controls then remain independent: only an internal programme/modules/milestones/materials draft can be applied after its own confirmation; website save, programme activation, admissions, fees, payments, communications, advertising, publication, credentials, and providers retain their separate protected workflows.

| Capability | V1 status |
| --- | --- |
| Paste approved expertise or notes | Available as a private, owner/admin-only source. |
| Generate a structured expertise analysis | Available on demand, with a confirmation gate and no raw-source audit metadata. |
| Prepare an outcome-first curriculum/project/offer/website foundation | Available privately through the existing Institution Builder handoff. |
| Create an internal draft programme and materials | Uses the already-confirmed Institution Builder path only. |
| Generate or publish a website, campaign, price, sales message, admission, invoice, payment, enrolment, credential, or portfolio | Not created by this engine. Separate workflows and approvals remain required. |
| Assess learners, adapt from performance, issue a portfolio/credential, or run an AI career agent | Not part of V1; requires dedicated learner data, consent, review, and academic/governance controls. |
| Parse arbitrary files, websites, YouTube content, or audio | Deferred pending source-authorisation, parsing, storage, and privacy design. |

## Quality, academic integrity, and privacy

The engine does not treat generated content as accurate by default. It tells the owner to validate factual claims, sources, prerequisites, accessibility, difficulty progression, delivery capacity, public copy, price/offer terms, and any assessed activity. It must never silently overwrite an owner’s course, assessed material, source, programme, or public website.

No source analysis may identify an individual learner as weak, ready, high risk, employable, qualified, complete, or eligible. It must not generate answers to assessed work, calculate grades, issue results, decide completion, claim job outcomes, or guarantee income, employment, demand, accreditation, or certification.

## Future controlled expansions

The master prompt’s file ingestion, dynamic learner path, project portfolio, public verification, career guidance, marketplace, lead funnel, experimentation, feedback analysis, content-refresh, calendar, scale-readiness, and autonomous-task ideas remain directional workstreams. Each requires its own data model, evidence basis, consent/privacy assessment, server-side authorisation, rate limit, confirmation gate, audit boundary, and validation plan before it can be released.
