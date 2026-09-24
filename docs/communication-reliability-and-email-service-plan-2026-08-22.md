# NSOS Communication Reliability and Email-Service Plan

**Status:** Approved implementation direction. Live email delivery remains blocked until the NSOS sender domain is verified, but the channel model, setup experience, delivery state model, and admissions-upload work can proceed independently.

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

NSOS will launch email in two layers.

| Layer | Sender pattern | Scope | Constraint |
|---|---|---|---|
| Managed NSOS transactional mail | `NSOS Notifications <notifications@nsos.ng>` | Sign-in links, guardian/staff invitations, admission letters, security notices | Requires active `nsos.ng`, Resend domain verification, and platform `AUTH_EMAIL_FROM` update |
| School-branded mail | Display name such as `Greener Future Academy via NSOS`; optional verified school sending domain later | School admissions and announcements | A school must verify any custom sending domain before it is used as the technical `From` address |

Until a school verifies its own sender domain, the technical sender will remain the verified NSOS sender with the school’s approved display name and a school-controlled reply-to address only when that address is valid. NSOS will never impersonate an unverified school domain. Resend requires a domain owned and verified in the account before it can send from addresses at that domain.[1]

The production launch sequence is therefore:

1. Complete the compliant `nsos.ng` credit-transfer and registration path with DomainKing.
2. Add the exact Resend-issued DNS records in the `nsos.ng` DNS zone and wait for Resend verification.
3. Set `AUTH_EMAIL_FROM` through the managed secrets process to `NSOS Notifications <notifications@nsos.ng>`.
4. Send controlled staff and guardian invitation tests, recording accepted or failed outcomes.
5. Enable provider delivery-webhook tracking before treating provider acceptance as confirmed delivery.

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
