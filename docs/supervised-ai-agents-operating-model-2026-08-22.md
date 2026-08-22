# NSOS Supervised AI Agents: Operating Model

## Purpose

NSOS now provides two **supervised AI agents** for school owners and administrators. The AI onboarding agent translates a school’s real, tenant-scoped readiness signals into a short next-step plan. The AI website-building agent turns an owner’s approved website brief into an editable, unpublished content draft. These agents reduce setup friction, but they do not replace school authority or operate school accounts independently.

## What the agents can do

| Agent | Inputs it uses | Output | What happens next |
|---|---|---|---|
| AI onboarding agent | The signed-in school’s readiness status and the owner’s short request | A recommended supported setup step and up to three clarification questions | The owner opens the existing academic, staff, finance, learner, or website workflow and completes its normal review gates. |
| AI website-building agent | School name, state, existing unpublished copy, and the owner’s supplied public-content brief | An editable headline, introduction, and review note | The owner edits the draft and explicitly confirms a draft-only save. Publication and custom-domain activation remain separate actions. |

## Required controls

Every AI request is made on the server, scoped to the active school, limited by per-user rate controls, and recorded as a non-sensitive audit event. Only an active owner or administrator can request an onboarding plan or generate a website draft. AI output is validated against an allow-list of actions before it is shown to a user.

> **An AI plan is not an instruction to execute.** It cannot create a session, send an invitation, activate a fee, publish a website, connect a domain, configure a provider, or change a financial record. Existing confirmation-gated workflows perform those actions only after the school user reviews the exact details and confirms them.

## Information the agents must not request or invent

The agents must not ask for or create passwords, API tokens, payment-card data, bank-account information, learner or guardian personal data, staff personal data, or provider credentials. In particular, staff identity data must be entered directly into the secured staff-invitation form rather than supplied to the AI planner.

The website-building agent must not invent staff profiles, contact details, achievements, fees, facilities, rankings, awards, accreditation, government approvals, testimonials, reviews, statistics, availability claims, or promised outcomes. Unsupported public claims are removed from generated copy; owners must still verify every statement before saving or publishing.

## Current supported execution path

The agent can direct an owner to the following already-supervised NSOS workflows: academic foundation creation, staff invitation preparation, finance-draft preparation, learner management, and website drafting. Academic records still require approved dates, real class names, and a reviewed curriculum template. Staff invitations retain a separate send confirmation. Fees remain inactive drafts until separately activated with final approval. Website drafts remain unpublished.

## Boundaries and future expansion

The agents are designed for guided configuration, not autonomous governance. Any future capability that would send communications, alter finance, publish public content, activate a domain, connect a provider, or create people must continue to be modelled as a specific, tenant-scoped action with a visible summary, an explicit confirmation, server-side authorization, validation, audit evidence, and targeted regression tests.
