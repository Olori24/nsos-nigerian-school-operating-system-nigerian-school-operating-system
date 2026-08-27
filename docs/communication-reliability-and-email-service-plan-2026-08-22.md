# NSOS Communication Reliability and Email-Service Plan

**Status:** Updated operating model. The NSOS managed outbound sender is `notifications@nsos.top`, and one owner-authorized controlled invitation was previously accepted by the provider. On 27 August, Resend Support stated that `nsos.top` is verified and ready to send, but an immediate independent read-only API check still returned `partially_failed` with sending enabled and receiving disabled. This is an unresolved provider-status contradiction, so no new sender-health or delivery-readiness claim is made. It does not establish inbox delivery, open tracking, inbound mail, bulk campaigns, or school-branded technical sender capability.

## 1. Problem Statement

NSOS already has encrypted provider configuration, connection checks, SMS callback handling, message logs, and durable `sent` or `failed` records. However, the present provider table permits only one notification configuration per school. A school therefore cannot keep independent **SMS**, **WhatsApp**, and **email** providers ready at the same time. The current platform email sender is also rejected because its sender domain is not verified in the connected email account.

> A provider configuration is not a delivery guarantee. NSOS must show whether the channel is configured, whether a provider test succeeded, whether an individual message was accepted by the provider, and—where a provider reports it—whether it was delivered or failed.

## 2. Target Channel Model

Each school will hold separate, tenant-scoped communication-channel configurations. A school may configure all channels concurrently; changing SMS must never replace its email or WhatsApp settings.

| Channel | Initial providers | Required readiness evidence | Delivery state available in NSOS |
|---|---|---|---|
| Email | NSOS managed sender, Resend, SendGrid | Verified sending domain, sender identity, encrypted API credential, successful verification test | Queued, accepted, sent, failed; delivered/bounced when the provider webhook is enabled |
| SMS | Termii, Twilio | Approved sender ID where required, encrypted credential, successful test, signed status callback | Queued, sent, delivered, failed |
| WhatsApp | WhatsApp Cloud, Twilio WhatsApp | Business account or sender number, encrypted credential, approved template where required, successful test | Queued, accepted, sent, delivered, read where supplied, failed |
| In-app | NSOS | No external credential required | Published or acknowledged inside the signed-in workspace |

The replacement persistence model will retain the existing payment configuration separately and add a **communication channel** discriminator. The unique boundary becomes `schoolId + channel`, not the current single `schoolId + notification` configuration. Existing provider data will be migrated deterministically: Termii and Twilio to SMS, Resend and SendGrid to email, WhatsApp Cloud to WhatsApp, and `in_app` to in-app. No credential is exposed or copied into an audit log.

## 3. Delivery Reliability Controls

NSOS will implement a channel readiness center rather than a generic notification tab. Each channel card will show its configured provider, readiness, last connection validation, sender identity, callback or webhook state, and a deliberately scoped test action. It will distinguish the following states:

| Layer | Meaning | User-facing response |
|---|---|---|
| Blocked | A prerequisite such as domain verification or provider credential is absent | Give the exact setup action; do not claim the message was sent |
| Queued | NSOS accepted the request but has not called the provider | Show pending status and retry eligibility |
| Accepted/Sent | Provider accepted the request | Show provider reference and await callback if supported |
| Delivered | Provider reported terminal delivery | Show a verified delivery indicator |
| Failed | Provider rejected the request or a terminal failure callback arrived | Store a safe failure reason and offer owner/admin recovery guidance |

Retries will be explicit and idempotent. A retry creates a fresh attempt linked to the original logical message; it does not overwrite history or create a false delivered state. Provider credentials, full message content, raw webhook signatures, and recipient address details remain outside broad dashboards and security-audit metadata.

## 4. NSOS Email-Service Operating Model

NSOS is configured with a **single managed outbound transactional sender**. The technical `From` configuration is the bare mailbox `notifications@nsos.top`; application copy and transactional templates identify NSOS and, where appropriate, the originating school. The bare mailbox is intentional: it avoids unsafe display-name parsing at the environment boundary. The provider’s Support statement and read-only API state currently conflict, so this configuration remains subject to sender-health reconciliation rather than being declared healthy. Resend permits sending only from an account-owned, verified domain.[1]

| Capability | Current state | Controls and evidence | Explicit limit |
|---|---|---|---|
| Passwordless sign-in links | Existing protected workflow; current sender-health reconciliation pending | Normalized recipient, short-lived token, origin validation, provider-acceptance or fail-closed status | Provider acceptance is not inbox delivery; do not assert current send readiness until the provider state agrees |
| Staff and guardian invitations | Existing protected workflow; current sender-health reconciliation pending | Tenant scope, linked-recipient checks, confirmation gates, sent/failed records, one controlled provider-accepted test | No autonomous invitation sending or new sender-health claim |
| Admission letters and protected student-record PDFs | Existing protected workflow; current sender-health reconciliation pending | Tenant/record linkage, explicit confirmation where required, sender readiness, rate limits, audit-safe metadata | No bulk delivery or recipient-data leakage |
| School-branded technical sender | Not enabled | Requires a separately verified school domain and approved sender policy | NSOS does not impersonate an unverified school domain |
| Inbound mailboxes, replies, and helpdesk processing | Not configured | None | `mail`, `pop`, and `smtp` DNS defaults do not establish a usable NSOS mailbox |
| Bulk campaigns, open tracking, and delivery webhooks | Not enabled | Future explicit provider/webhook approval required | Provider submission must not be presented as delivered or opened |

The tenant-safe default is therefore **NSOS-managed transport with school context in approved content, not in an unverified `From` address**. Per-school provider credentials, technical sender overrides, raw recipients, raw content, and provider secrets remain outside broad dashboards and audit metadata.

### 4.1 Current launch controls

1. An authorised workflow must select a tenant-scoped recipient or accept an explicitly supplied sign-in address; no email is initiated merely by opening a screen.
2. Consequential invitation, protected-record, and enrollment communication routes retain their existing final confirmation and rate-limit controls.
3. NSOS records whether Resend accepted or rejected a request. It does not claim delivered, opened, or read without an authenticated provider callback.
4. A provider failure preserves the underlying student, enrollment, invitation, and finance state. Recovery is an explicit staff action, not an automatic retry loop.
5. The managed sender is platform-wide. A future school-specific technical sender requires separate domain verification, tenant ownership evidence, policy approval, and a controlled cutover.

### 4.2 Changes that require a separate owner decision

| Proposed change | Why it is consequential | Required approval/evidence before implementation |
|---|---|---|
| School-specific `From` domains | Alters external identity and DNS posture | School ownership, provider-issued verification records, owner confirmation, and sender-policy test |
| Reply-to processing or an NSOS mailbox | Introduces inbound personal-data handling and support operations | Mailbox provider, retention/access policy, support ownership, and privacy review |
| Delivery/bounce/open webhooks | Adds signed external callbacks and message-status processing | Provider webhook specification, secret, replay protection, data-minimisation review, and test evidence |
| Bulk campaigns or announcements by email | Expands recipient reach and consent obligations | Audience/consent model, rate controls, unsubscribe design, and separate launch approval |
| Automatic retry/recovery | Can create duplicate recipient contact | Idempotency design, retry policy, recovery controls, and owner approval |

## 5. Public Admission Passport and Fee-Receipt Uploads

The public admissions form will gain two independently configurable school requirements: **passport photograph** and **admission-fee receipt/evidence**. The upload flow will use private object storage and database metadata only; raw file bytes will not enter the database.

| Item | Allowed formats and limits | Storage and review rule |
|---|---|---|
| Passport photograph | JPEG, PNG, or WebP; maximum 3 MB | Private object key plus metadata, shown only to authorized admissions reviewers and optionally reused after enrollment |
| Admission-fee receipt | JPEG, PNG, WebP, or PDF; maximum 4 MB | Private object key plus metadata, marked `submitted` for finance/admissions review; never marks an invoice paid automatically |

Public submissions will validate MIME type, byte size, filename, and school publication status before accepting files. A completed application will link each uploaded item to the correct tenant-scoped application. Applicants will see a confirmation that documents were received, but no staff-only review detail. Authorized reviewers can view, request replacement, or record a review outcome. Receipt evidence remains an evidence record, not a payment posting or fee waiver.

## 6. Supervised School Website Setup Agent

The website agent will operate as a constrained configuration assistant, not an autonomous publisher. An owner or administrator supplies school-approved facts such as school name, contact channels, address, welcome text, values, approved programmes, admission status, and logo. The agent can prepare a structured proposal for the existing website studio:

- hero title and introductory copy;
- approved school information sections;
- admissions call-to-action wording;
- contact and footer content;
- a list of information still required from the school.

The agent must not invent testimonials, learner achievements, staff members, photographs, fees, accreditation, addresses, phone numbers, or public claims. It will preview proposed changes, identify each changed field, require explicit owner/admin confirmation, save only approved configuration, and leave website publication as a separate owner/admin action.

## 7. Delivery Order

1. Add secure passport and fee-receipt uploads to the public admissions workflow.
2. Migrate provider configuration to independently scoped communication channels and build the readiness center.
3. Add safe message attempt, provider-status, and recovery presentation where existing delivery data supports it.
4. Complete `nsos.ng` and activate the verified managed NSOS sender.
5. Build the supervised website setup agent with structured proposal and confirmation gates.

## References

[1] [Resend — Verified Domains](https://resend.com/docs/dashboard/domains/introduction)
