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
