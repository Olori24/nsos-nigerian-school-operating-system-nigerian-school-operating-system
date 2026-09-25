# NSOS School Website Production Runbook

This runbook tracks the production work that depends on the Manus-hosted deployment and external DNS. Application routing is already designed to recognize one-label `*.nsos.top` school subdomains while reserving `www.nsos.top` for the NSOS platform.

## Objective

A published school should be reachable through:

```
https://<school-short-code-lowercase>.nsos.top
```

Example:

```
OOA -> https://ooa.nsos.top
```

The public school site must retain the school identity while NSOS remains the underlying operating system.

## Manus execution queue

Run these steps only when Manus credits are available and the correct production project is identified.

### 1. Bind the NSOS domain

- Open the production Manus website/project.
- Add the required custom domain configuration for `nsos.top` / the supported wildcard-domain arrangement.
- Follow Manus's current DNS instructions rather than inventing record types.
- Do **not** replace existing root mail records. In particular, preserve the current email/MX configuration unless the DNS provider explicitly confirms a safe change.

### 2. Configure wildcard DNS

Required target:

```
*.nsos.top
```

Point the wildcard record to the Manus production target exactly as Manus specifies.

Keep these concerns separate:

- `www.nsos.top` -> NSOS platform root
- `*.nsos.top` -> school-site routing
- root/email records -> existing mail infrastructure

### 3. Verify the first school

Use OOA as the acceptance test:

```
https://ooa.nsos.top
```

Verify all of the following:

- DNS resolves.
- HTTPS certificate is valid.
- The Manus deployment serves the NSOS application.
- OOA content is returned.
- The URL does not expose a Manus URL as the primary public link.
- Admissions CTA points to the correct OOA admissions route.
- School-specific logo, identity and content remain intact.
- `www.nsos.top` still resolves to the NSOS platform rather than OOA.

### 4. Verify a second school

Create/select another published school and verify:

```
https://<second-school-code>.nsos.top
```

Acceptance criteria:

- It resolves independently.
- It loads that school's public site.
- It does not display OOA content.
- Its admissions route is tenant-scoped.
- No school can access another school's protected records through the public site.

### 5. Website Studio acceptance test

Inside the protected school workspace:

1. Edit headline.
2. Edit introduction.
3. Change primary brand color.
4. Update contact details.
5. Save draft.
6. Confirm draft preview changes.
7. Publish.
8. Open the public school subdomain.
9. Confirm the published content matches the approved draft.
10. Unpublish and confirm the public site no longer presents the unpublished site as active.

No production domain change should be triggered by ordinary content editing.

### 6. Canonical URL / redirect checks

After binding:

- Public links should prefer the school subdomain.
- Do not claim the Manus URL as the canonical school address.
- Check HTTP -> HTTPS behavior.
- Check trailing-slash behavior where applicable.
- Check that `www.nsos.top` remains the platform root.
- Check that unknown/nested subdomains are not accidentally mapped to a school.

### 7. Evidence to capture

Record:

- DNS record screenshot/export.
- Manus custom-domain configuration screenshot.
- Manus published/live URL.
- `ooa.nsos.top` browser screenshot.
- HTTPS certificate/security indicator.
- second-school subdomain screenshot.
- Website Studio draft screenshot.
- published-site screenshot.
- any Manus deployment/domain IDs needed for future troubleshooting.

Do not mark the production domain task complete without evidence.

## Rollback

If wildcard routing causes an unexpected production issue:

1. Do not delete existing email DNS records.
2. Disable/revert only the new wildcard/domain binding.
3. Confirm `www.nsos.top` remains available.
4. Confirm the existing Manus deployment remains reachable through its original published URL.
5. Record the failure mode before retrying.

## Application-side contract

The application is intentionally responsible for tenant routing, not DNS provisioning.

Current contract:

- One-label `*.nsos.top` school subdomains are recognized.
- `www.nsos.top` is reserved.
- Root `nsos.top` is not a school.
- Nested names such as `foo.bar.nsos.top` are not school subdomains.
- The short code maps to the existing public school website lookup.
- Existing custom-domain verification remains supported.
- Public school websites remain separate from protected school operations.

## Future website v2 build queue

The next application-side expansion should add school-owned content without fabricating facts:

- academics/programmes
- principal/head message
- campus/gallery
- news/events
- FAQs
- school-provided testimonials
- social links
- richer admissions journey
- per-school SEO/Open Graph metadata
- structured school information
- mobile-first performance

Every public field must originate from school-provided or NSOS-recorded data. No fabricated school statistics, testimonials, staff credentials or outcomes.

## PDF integration checkpoint

A separate document supplied by the product owner is expected to be reviewed later. When available, compare it against this architecture before implementing overlapping features.

Do not let document-derived ideas bypass:

- tenant isolation
- protected/public boundaries
- human approval for consequential actions
- audit logging
- consent/privacy requirements
- deterministic evidence requirements where applicable
