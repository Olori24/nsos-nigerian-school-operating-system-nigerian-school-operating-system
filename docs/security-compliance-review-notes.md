# NSOS Security and Compliance Review Notes

## Authoritative Nigerian sources located

| Source | Relevance to NSOS |
| --- | --- |
| [Nigeria Data Protection Commission resources](https://ndpc.gov.ng/resources/) | Official repository for the Nigeria Data Protection Act, 2023 and related regulatory materials. |
| [NDPC General Application and Implementation Directive](https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf) | Primary implementation guidance to use when finalising controller accountability, impact assessment, security safeguards, children’s-data handling, data-subject rights, vendor controls, and breach-response procedures. |

## Initial operating assumptions

NSOS processes sensitive school operational information, including data concerning children, parents or guardians, staff, academic records, attendance, fees, communications, and provider credentials. The platform must therefore treat privacy-by-design, tenant isolation, least privilege, auditability, retention controls, incident response, and third-party processor oversight as release requirements rather than optional enhancements.

> This review is an engineering and operational assessment, not a substitute for advice from a qualified Nigerian data-protection professional.

## Application-security baseline sources

| Source | Engineering decision for this release |
| --- | --- |
| [OWASP HTTP Security Response Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) | Add a conservative baseline of `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, cross-origin isolation controls, and production-only transport-security guidance. |
| [OWASP API4:2023 — Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/) | Maintain explicit payload limits and add deterministic per-client request limits, with tighter limits around public admissions and provider-triggering workflows. |

The release uses controls that remain valid in a stateless autoscaling deployment: headers set per response, bounded input parsing, and a shared database-backed fixed-window throttle. A managed gateway/WAF remains a recommended defence-in-depth control for bot protection, volumetric attacks, and traffic filtering ahead of broad public exposure.

## Implemented first hardening release

| Control | NSOS implementation | Scope and limitation |
| --- | --- | --- |
| Browser response policy | CSP, anti-framing, content-type, referrer, permissions, cross-origin, and production transport-security headers are issued by Express before all routes. | The CSP is intentionally compatible with the current hosted analytics and font dependencies; tighten external source allow-lists as those integrations are finalised. |
| API response handling | `/api` responses use `Cache-Control: no-store`; JSON parsing is limited to 10 MB and URL-encoded bodies to 1 MB. | Admission-document upload validation retains its own narrower application-level size limit. |
| Cross-site state changes | `POST`, `PUT`, `PATCH`, and `DELETE` requests to tRPC must carry the same application origin when an `Origin` header is supplied. | This supplements OAuth state validation and browser CORS behaviour; it does not replace a future explicit CSRF-token policy if the API is opened to other browser clients. |
| Abuse resistance | An expiry-indexed, shared database fixed-window throttle protects general API traffic, public admissions submission, and live SMS-test dispatch across autoscaled instances. The bucket key is HMAC-derived, so raw client addresses are not stored. | Add gateway/WAF bot and volumetric protection before high-volume public rollout. |
| Sensitive-operation ledger | `securityAuditEvents` records tenant-scoped provider configuration changes, live SMS actions, membership assignment, website/domain changes, admissions decisions/enrolment, result approval/publication, invoice creation, and payment recording. Metadata is redacted before storage and the read endpoint is owner/admin-only. | The application exposes no delete/update operation, but database-level immutability and external log retention remain follow-on controls. |

## Next controls before broad rollout

1. Configure a managed WAF or gateway-level rate limiter, bot protection, and request anomaly monitoring across all replicas.
2. Create an incident response and breach-notification runbook, run a restore exercise, and introduce a documented backup-retention cadence.
3. Complete a DPIA, privacy notice, parental/guardian rights flow, deletion and export workflow, and vendor data-processing agreement review with a qualified Nigerian data-protection professional.
4. Export to a private GitHub repository with protected branches, required tests, dependency updates, secret scanning, and code-review rules.
