# NSOS Verified Email Sender Handoff

**Current status:** Blocked externally. The unchanged integration test reports that the configured `AUTH_EMAIL_FROM` sender uses `resend.dev`, which is not present as a verified domain in the connected Resend account.

> **No DNS record, sender domain, email address, invitation, passwordless email, or Resend setting is changed by this document.** The account holder must explicitly approve every provider-side step.

## Owner-controlled sequence

| Step | Owner action | NSOS action after evidence | Completion evidence |
| --- | --- | --- | --- |
| 1. Choose the sender domain | Select a domain that NSOS controls and is intended for transactional email. Do not use a domain that is pending, unbound, or not owned by NSOS. | Confirm the selected domain only; do not infer or purchase one. | Owner names the exact domain. |
| 2. Add the domain in Resend | In the Resend account, add the selected domain and request its verification records. | Inspect the provider-issued records only after access is approved. | Resend shows the new domain and its required records. |
| 3. Publish provider-issued DNS records | Add exactly the DNS values Resend displays at the authoritative registrar/DNS provider. | Verify only the records the provider supplied; never guess an IP, MX, SPF, DKIM, or DMARC value. | Resend reports the domain as verified. |
| 4. Set a transactional sender | Choose a clear sender address such as `noreply@<verified-domain>` or another owner-approved address within the verified domain. | Request the exact `AUTH_EMAIL_FROM` value through the protected project secret flow. | Sender address is within the verified domain. |
| 5. Validate the application gate | Re-run the existing sender-domain integration test. | Report the real pass/fail result without bypassing the test. | The verified-domain test passes. |
| 6. Perform a controlled delivery check | Send only an explicitly approved test email to a controlled recipient. | Record the provider outcome and preserve ordinary delivery failure handling. | The provider returns a delivered/accepted result for the test. |

## Required information before the next action

The owner must provide or approve the exact sender domain and either approve the Resend connector or perform the domain work directly in the Resend dashboard. If the owner completes it directly, send back a screenshot or the verified domain name; NSOS will then request the exact sender address via the project-secret control and rerun the unchanged test.

## Explicit exclusions

This handoff does not bind a custom website domain, purchase or renew a domain, move DNS hosting, alter existing website records, enable marketing broadcasts, change provider credentials, or send real school communications. It covers the transactional sender prerequisite only.

## 2026-08-25 verified evidence

The account holder selected `nsos.top` and explicitly approved a Resend sender-domain verification handoff followed by the minimum required DNS work. Read-only Resend API evidence shows an existing sending-only `nsos.top` domain in `eu-west-1` with status `not_started`; it has not been verified and no application sender has been changed. Resend supplied three required records: a DKIM TXT at `resend._domainkey`, plus an MX (priority 10) and TXT SPF record at `rsend`, all relative to the `nsos.top` zone. Public DNS resolution was not authoritative at review time: the delegated nameservers refused the NS and TXT queries.

The user-authorized DomainKing session is accessible and shows `nsos.top` as the sole registered domain, but its DNS Management page currently has no active zone. The Add DNS Zone dialog exposes `nsos.top` and a Continue control; repeated submitted clicks did not persist a zone or surface an error. No DNS zone, DNS record, sender address, email, website routing, renewal, payment, or unrelated DomainKing setting has been changed. The optional Resend connector was enabled after owner confirmation, but its connector credential returned an invalid-key error; the existing application-level Resend credential still lists the domain successfully and should remain the source of verification evidence.

On the domain-specific DNS record screen, DomainKing’s only available recovery control is **Create DNS Zone**. Its required field is an IP address, indicating that it creates an address-backed zone rather than an empty email-authentication zone. No hosting IP was supplied or inferred, so the form was cancelled with no change. This blocks safe publication of the Resend records through this interface until the owner provides an approved hosting IP or DomainKing support supplies an email-only DNS-zone path that does not require an A-record target.

The owner then approved a narrowly scoped request to DomainKing Support. The support chat could not be safely completed until the account details already visible in the signed-in session were explicitly authorized for use. A standard Support ticket form was then populated with the approved DNS-only request, using no attachment, hosting endpoint, password, or extra account details. DomainKing confirmed the ticket as **#738432**, titled “Request DNS-only management for nsos.top (no A record),” with Support department, Medium priority, and Open status at submission. No DNS zone, DNS record, sender address, email delivery, website routing, registration, billing, or unrelated account setting was changed. The sender-domain configuration remains blocked pending DomainKing’s response and Resend DNS verification.
