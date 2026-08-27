# NSOS Branded Email Identity Proposal

**Status:** Design only. No inbox, alias, DNS record, sender, reply route, provider configuration, or email delivery behaviour has been changed by this proposal.

## Purpose

NSOS needs a recognizable operational email identity that lets schools, families, and prospective customers distinguish product notifications from people who can answer support, security, admissions, or billing questions. The model must retain the current safety boundary: transactional sending, inbound support handling, and school-specific senders are separate capabilities with separate approvals.

## Recommended Address Model

| Address | Public purpose | Mailbox / sender rule | Initial status |
|---|---|---|---|
| `notifications@nsos.top` | Passwordless links, platform notifications, invitations, and other confirmation-gated transactional email | **Outbound-only** platform sender; no replies assumed | Existing technical sender; current provider health must be restored before it is treated as ready |
| `support@nsos.top` | General product, account, and school-operations support | Shared inbound team inbox with named human ownership and a response policy | Proposed |
| `security@nsos.top` | Vulnerability reports, account-security issues, and abuse reports | Restricted inbound queue with named security owner; never used for learner or finance records | Proposed |
| `billing@nsos.top` | NSOS subscription and platform-billing questions | Shared inbound queue; cannot receive or approve school fee-payment evidence | Proposed |
| `admissions@nsos.top` | NSOS product onboarding and prospective-school enquiries | Shared inbound queue; not a substitute for a tenant school’s admissions address | Proposed |
| `hello@nsos.top` | General partnership and brand enquiries | Shared inbound queue or alias to support, subject to owner choice | Proposed |
| `privacy@nsos.top` | Privacy and data-subject enquiries | Restricted inbound queue with an accountable privacy owner | Proposed |

> **Core rule:** `notifications@nsos.top` is a technical delivery identity, whereas `support@nsos.top` and the other operational names are human-owned inboxes. A display name, alias, or reply address must not be represented as a functioning mailbox until inbound delivery, ownership, retention, and access controls are explicitly configured.

## Recommended Operating Model

The recommended first implementation is **one managed NSOS support mailbox** with approved aliases for `support`, `billing`, `admissions`, and `hello`, plus separately protected ownership for `security` and `privacy`. This avoids creating many unmanaged personal inboxes while keeping every public function recognisable. The platform should maintain `notifications@nsos.top` as the only transactional sender until a verified sender-health check passes again.

Inbound mail should remain disabled until a mailbox provider, access model, support coverage, retention period, escalation procedure, and data-handling policy are all approved. In particular, school-family correspondence, admission documents, payment evidence, and learner information must not be routed into an informal platform inbox.

| Capability | Proposed owner | Required evidence before activation |
|---|---|---|
| Platform transactional sender | NSOS platform operations | Healthy verified sender-domain state and controlled provider acceptance |
| Shared support mailbox and aliases | Named NSOS support owner | Mailbox provider, named users, access review, retention rule, response coverage, and DNS records |
| Security / privacy routes | Named security and privacy owners | Restricted access, acknowledgement procedure, escalation route, and retention rule |
| Tenant-school technical sender | Individual tenant owner | Tenant domain ownership, verified domain records, sender policy, and controlled test |
| Inbound reply processing inside NSOS | Platform engineering and support | Privacy review, signed inbound/webhook design, data minimisation, abuse controls, and explicit launch approval |

## Approval-Gated Implementation Order

1. **Restore transactional sender health.** The fresh full suite reported `nsos.top` as `partially_failed` at the sender provider even though the listed TXT/MX verification records were read-only reported as verified. Do not add more addresses or depend on outbound delivery until that status is investigated and any action is separately approved.
2. **Choose a mailbox provider.** Select a managed mailbox service for `support@nsos.top` and operational aliases. This is a separate procurement and account-access decision; it should not be inferred from the existing sending provider.
3. **Create only the approved initial mailbox and aliases.** Create the addresses through the selected mailbox provider, assign named owners, and configure the provider-issued DNS records only after explicit confirmation.
4. **Publish support contact information.** Add public contact links only after the mailbox has been tested with an owner-authorised inbound message and the responsible team confirms access.
5. **Consider advanced integration later.** Inbound email ingestion, automated support tickets, reply-to processing, delivery webhooks, bulk mail, and school-specific senders remain separate technical initiatives.

## Lower-Cost Mailbox Options — Research Only

| Option | Official published offer | Suitability for NSOS | Important limit |
|---|---|---|---|
| Zoho Mail Free | One custom domain, up to five users, and 5 GB per user at no cost | Best first option to test `support@nsos.top` plus a small set of named operational inboxes or aliases | The free plan is available only in select data centres and omits IMAP, POP, and ActiveSync; eligibility must be confirmed during signup.[2] |
| Zoho Mail paid tiers | Custom email, alias and group features, with paid mail-only and workplace options | A practical upgrade if NSOS needs more users, delegated support, advanced mobile access, or retention controls | Exact pricing and availability are provider- and region-dependent; no plan has been selected. [2] |
| Migadu Micro | Flat annual account plan, unlimited addresses, and a published 20 inbound / 20 outbound message-per-day limit | A low-cost alternative for a very small, carefully staffed support mailbox with several branded aliases | It is not free, is billed annually, and its low daily volume is unsuitable for platform transactional mail; NSOS should keep transactional sending separate. [3] |

The safe recommendation is to **check Zoho Mail free-plan eligibility first**, because the official offer covers one custom domain and up to five users in eligible data centres. If it is unavailable or insufficient, evaluate Migadu only for a low-volume human support inbox—not for NSOS passwordless or notification traffic. In every case, the provider will require mailbox-domain verification and MX changes; those changes must not be made until the current transactional sender’s DNS posture is reviewed and the owner explicitly approves the mailbox activation.

## Sender-Health Support Inquiry Status

The sender provider’s read-only domain check continues to report `nsos.top` as `partially_failed`, even though the listed TXT/MX verification records are reported as verified. A non-mutating verification request did not change that status. The owner approved a redacted provider-support inquiry. The public support form returned a generic processing error after its one submission attempt, with **no confirmation or case reference**. The owner then authenticated in the existing Resend account, and the distinct in-account Contact us channel confirmed **“Your message was sent.”** The inquiry was classified as **High — Blocked, but sending still works**. A subsequent automated acknowledgement confirmed receipt.

On 27 August, Resend Support replied that it had checked the account, confirmed the domain is now verified, and stated that sending can begin. Immediately after that message, the existing project credential performed an independent **read-only** domain-list check. It still returned `status: partially_failed`, with sending enabled and receiving disabled. No verification-record values, recipient data, delivery/open telemetry, secrets, or configuration were retrieved or changed. The support statement and API state therefore conflict; sender health remains an open provider-status reconciliation item until Resend confirms the API state or supplies remediation.

The fresh full NSOS Vitest suite completed **460 passing tests across 125 passing test files**, with one failing live sender-authorization check. That check failed solely because the provider reported `partially_failed`, which is intentionally outside the accepted sending states (`verified` and `partially_verified`). The result is validation evidence, not a reason to weaken the sender gate or alter its expected status.

No DNS record, sender setting, mailbox, inbound setting, email recipient, or delivery workflow was changed while investigating this discrepancy.

## Current Limits

This proposal does not claim inbox delivery, reply handling, mailbox availability, support staffing, a response-time commitment, tenant-school branded senders, inbound email processing, or additional email addresses. It does not create mailboxes or alter DNS. The existing sender provider’s authoritative status remains the source of truth for transactional email health.[1]

## Reference

[1] [Resend — Domains](https://resend.com/docs/dashboard/domains/introduction)
[2] [Zoho Mail — Pricing](https://www.zoho.com/mail/zohomail-pricing.html)
[3] [Migadu — Pricing](https://migadu.com/pricing/)
