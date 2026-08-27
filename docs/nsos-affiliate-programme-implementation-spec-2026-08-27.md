# NSOS Affiliate Programme Implementation Specification

**Status:** The internal-only configuration layer is implemented. It creates no affiliate, referral, attribution event, payout, outreach, public promotion, referral link, provider integration, or payment action. Recording the approved defaults remains an explicit platform-owner confirmation inside NSOS.

## Implementation Record

The released internal workspace contains platform-owner-only overview and confirmation procedures, an `affiliatePilotConfigurations` record, and an audit-safe `affiliatePilotEvents` record. The reviewed additive migration created both tables and their indexes. At post-migration verification, both tables contained **zero records**; no affiliate, school referral, or commission data was created.

The owner console presents the approved defaults—30-day attribution, 30-day refund/chargeback hold, ₦10,000 minimum payout, monthly manual review, standard paid-plan eligibility, and 20% first-payment basis—and requires a plain-language confirmation before recording them. It visibly states that partner enrolment, referral-link activation, publication, outreach, tracking, provider calls, and payouts are unavailable. The console is mounted only behind the existing platform-owner dashboard control and its server procedures use the established platform-owner guard.

Validation passed TypeScript, all **129** test files / **468** tests with one intentional live-provider skip, and the production build. Automated screenshot capture was unavailable because the managed preview endpoint had no preview URL; the restricted owner-only console therefore has source-level and route regression coverage rather than a browser-rendered capture.

## 1. Objective and Scope

The proposed NSOS Affiliate Programme enables the NSOS platform operator to approve a limited number of technology creators and other eligible partners, attribute eligible institution referrals through a privacy-minimised mechanism, and review a one-time commission equal to **20% of a Qualified Referral’s Net First Payment**. It must be an operator-owned commercial capability, not a school-tenant feature.

The initial implementation must reuse NSOS’s existing control philosophy: verified payments are recorded manually in the operator revenue workspace, and externally consequential marketing actions follow a private draft, approval, paused-preparation, and explicit-activation sequence. The affiliate capability must not autonomously enrol a partner, send a message, issue a public link, create a payment, calculate a payable commission, or contact a provider.

## 2. Ownership and Isolation Model

Affiliate records belong to the **NSOS platform**, not an individual school. A school must not be able to inspect affiliates, referral data, commission data, or another school’s commercial information. A referred school’s own subscription and billing information remains in the existing platform-revenue domain; the affiliate system receives only the minimum lifecycle signal necessary to propose a reviewable commission case.

| Actor | Permitted future capability | Explicitly excluded capability |
|---|---|---|
| Platform owner | Create programme drafts, approve/suspend affiliates, review attribution, approve or reject commissions, view audit-safe aggregated reporting | Automatic payout, automated partner approval, automatic public launch |
| Finance reviewer | Review verified-payment evidence and approve/reject a proposed commission in assigned scope | Change programme rules, access school operations data, send money automatically |
| Marketing reviewer | Review creator profile, disclosure language, permitted channels, and draft content | Change commission status or issue payouts |
| Approved affiliate | View only their own approved identifier, current terms version, high-level referral states, and non-sensitive reconciliation outcome | Access customer identity, school records, billing evidence, learner data, or other affiliates |
| School owner/administrator | See no affiliate personal data or partner economics by default | Approve platform partners, calculate commissions, or alter attribution |

## 3. Control States

Each lifecycle must be explicitly represented and transition only through an authorised server-side procedure. Every future mutation requires a reason where it is consequential and produces audit-safe metadata without raw content, personal payment details, or customer data.

| Record | Proposed states | Required transition control |
|---|---|---|
| Affiliate programme | `draft` → `legal_review` → `ready_for_activation` → `active` → `paused` / `closed` | Platform owner; final activation only after an explicit confirmation and required decision record |
| Affiliate applicant | `draft` → `under_review` → `approved` / `declined` → `suspended` / `terminated` | Platform owner; marketing disclosure review is mandatory before approval |
| Referral attribution | `captured` → `pending_qualification` → `qualified` / `disqualified` / `expired` | Server-side eligibility and operator review; reason required for disqualification |
| Commission case | `not_eligible` → `pending_review` → `approved` / `rejected` → `paid` / `voided` | Verified billing event, finance review, owner confirmation, and manual payment evidence |
| Partner content review | `draft` → `submitted` → `approved` / `returned` / `withdrawn` | Marketing reviewer; publication remains outside NSOS until separate approval |

## 4. Proposed Domain Model

The following is a **future schema proposal**, not an instruction to migrate the production database.

| Proposed record | Minimum fields | Privacy and integrity controls |
|---|---|---|
| `affiliate_programmes` | versioned terms reference, commission rate basis, permitted plans, attribution window, refund/chargeback period, payout rules, status | Only platform owner writes; historical versions immutable after activation |
| `affiliates` | opaque public identifier, approval status, permitted channels, terms version accepted, disclosure review state, suspension reason code | Separate protected identity/payment details from programmatic fields; no school or learner data |
| `affiliate_referrals` | opaque affiliate ID, opaque referred-organisation ID, source route, capture timestamp, consent-notice version, state, expiry | Do not record fingerprinting data, raw browsing history, learner/guardian data, or partner-provided customer notes |
| `affiliate_commission_cases` | referral ID, eligible billing-record reference, 20% calculation snapshot, exclusions, status, reviewer IDs, payment-evidence reference | Recalculate from immutable verified-payment evidence; no automatic “paid” transition |
| `affiliate_content_reviews` | affiliate ID, channel, disclosure type, approved claim identifiers, review status, reviewer, expiry | Store approved message identifiers rather than unnecessary free-text or audience data |
| `affiliate_audit_events` | actor role, action, safe target ID, prior/next state, timestamp, correlation ID, reason code | Never store secrets, bank details, raw recipient data, unredacted campaign copy, or school records |

## 5. Commission Eligibility Logic

The future commission service must read only the existing, independently verified platform billing status; it must never mark a school invoice paid, alter a subscription, or contact a payment provider. A commission case may be proposed only after the programme rules identify a Qualified Referral and a First Verified Payment.

The calculation snapshot is:

```text
proposed commission = 20% × Net First Payment
```

`Net First Payment` must exclude all values specified in the published Terms: taxes and government charges, refunds, reversals, chargebacks, credits, uncollected invoices, ineligible promotions, and other approved exclusions. The case becomes payable only after the programme’s selected review period passes and a finance reviewer plus platform owner approve it. A later refund, reversal, or fraud finding must create a review case; it must never silently debit a partner or modify unrelated school records.

## 6. Referral Capture and Data Minimisation

Affiliate attribution should use a short opaque parameter or code linked to the published NSOS platform domain. The referral landing surface must make the relevant privacy notice available before recording the identifier. The future service should retain only the affiliate identifier, referred organisation identifier, timestamp, referral source type, notice version, and lifecycle state needed to reconcile an approved referral.

The system must not use cross-site tracking, fingerprinting, location inference, student or guardian data, customer payment details, login credentials, private message content, uploaded documents, AI prompts, or detailed school-operational data for attribution. The affiliate-facing view should report only non-sensitive states such as “captured,” “under review,” “qualified,” “not eligible,” or “commission approved.”

## 7. Approval-First Workflows

### 7.1 Programme Configuration

The platform owner prepares a programme draft containing the selected attribution window, eligible plan list, refund/chargeback period, minimum payout amount, payout cycle, and review roles. Before activation, the UI must display a plain-language confirmation stating that the decision may create future commission obligations. Legal, tax, privacy, and commercial approvals must be recorded as references before the programme can become `ready_for_activation`.

### 7.2 Affiliate Review

Partner intake begins as a private review record. The owner or marketing reviewer verifies identity through an approved future process, permitted channels, disclosure wording, content claims, and terms acceptance. No link is active until the platform owner explicitly approves the partner. The system must offer immediate suspension and link revocation with a clear, audit-safe reason.

### 7.3 Referral and Subscription Handoff

A referral record may be captured only through the approved NSOS referral surface. It is not a school account, lead, invoice, subscription, or payment. A later independently verified platform billing record may propose a commission case, but it cannot settle a commission automatically. Existing subscription and payment controls continue to be the source of truth for commercial status.

### 7.4 Commission Review and Payment Evidence

The system calculates a proposed amount for reviewers using the frozen billing and programme-rule snapshot. Finance reviews the amount and exclusions; the platform owner gives a final explicit approval. A later manual payment process can attach a safe payment-evidence reference and transition the case to `paid`. In the initial release, NSOS must not initiate a transfer, call a payout API, store bank data in generic affiliate records, or pay automatically.

## 8. Marketing, Disclosure, and Claim Controls

The future partner workspace should use the same draft-first interaction pattern as NSOS’s advertising workflow. Creators submit a channel and disclosure type for approval; they must not claim affiliation, school endorsement, capacity, security, integration availability, accreditation, certification, learner outcomes, earnings, pricing, support response time, or rapid growth unless NSOS has an approved, evidence-based message for that claim.

Any Meta content that is branded content must follow the platform’s applicable branded-content and commercial-disclosure requirements. The affiliate programme’s legal review should also confirm local advertising and consumer-protection requirements before materials are published.[1]

## 9. Abuse, Suspension, and Dispute Handling

The initial release needs manual review queues for suspected self-referrals, duplicate attribution, fake registrations, manipulated traffic, undisclosed compensation, impersonation, spam, prohibited paid search, misleading claims, and refund/chargeback events. It must support a reversible `suspended` state, evidence-free reason codes visible at the correct role level, and an appeal or reconciliation record that does not expose customer data.

Disputes must reference a safe commission or referral identifier and be handled by an assigned platform reviewer. The implementation must never reveal the referred school’s private information to an affiliate merely to resolve a dispute.

## 10. Test and Release Requirements

Before a later implementation is considered for activation, it must add deterministic tests covering platform-owner-only administration, finance-role scope, school-tenant denial, affiliate self-scope, referral-id validation, idempotency, duplicate/self-referral prevention, immutable calculation snapshots, refund/chargeback review, manual payout confirmation, audit-data redaction, link revocation, privacy notice versioning, and claim/disclosure approval gates.

The release must be tested with no real partner, customer, bank, payout, tracking-provider, or marketing-platform action. Any live affiliate link, public programme page, partner contact, contract acceptance, payment integration, or payout must occur only after the final programme decisions, legal/tax review, and explicit owner approval.

## 11. Deferred Decisions and Activation Blockers

| Blocker | Required decision or evidence | Status |
|---|---|---|
| Programme commercial rules | Attribution window, eligible plans, refund period, payout threshold/cycle, currency, and payment method | Pending owner decision |
| Legal and tax | Final terms, governing-law clause, disclosure wording, tax/withholding process, and partner agreement | Pending Nigeria-qualified review |
| Privacy | Published referral notice, lawful basis, retention period, data-subject process, and analytics access control | Pending privacy approval |
| Financial operations | Named finance reviewer, manual payment evidence standard, reconciliation process, and fraud escalation route | Pending owner decision |
| Technical activation | Final schema/procedures, access model, tests, and non-production validation | Not started |
| External action | Partner recruitment, link issuance, public terms, marketing, payment account, and payouts | Not authorised |

## 12. Current Decision

NSOS may use this specification to plan a future implementation. It does not authorise implementation of affiliate records or flows, financial calculations in production, external outreach, public content, referral tracking, contract acceptance, provider connection, or payment. The next safe action is to obtain the unresolved commercial and legal/tax/privacy decisions, then seek a separate explicit approval for a bounded, internal-first build.

## Reference

[1] [Meta Business Help Center — Branded Content Policies](https://www.facebook.com/business/help/221149188908254)
