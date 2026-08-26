# NSOS Platform-Domain Routing Incident — 26 August 2026

## Scope

This note records a tester-facing public-entry incident only. It does not change, publish, unpublish, or otherwise modify any tenant school website, school record, domain verification record, provider, or learner data.

## Observed symptom

Before the repair release, a live browser visit to `https://nsos.top/` rendered the `School website unavailable` fallback. That fallback belongs to the tenant public-school resolver and is correct for an unrecognised or inactive school domain, but it is not the intended NSOS product entry page.

## Root cause and guarded repair

`client/src/App.tsx` treated Manus-hosted domains as NSOS platform hosts, but did not include the product’s configured custom domains. Consequently, `nsos.top` and `www.nsos.top` were routed to `DomainSchoolWebsite` as though they were school-owned custom domains.

The release defines `nsos.top` and `www.nsos.top` as case-insensitive NSOS platform hosts. All other external domains still use `DomainSchoolWebsite`, preserving active and published tenant school-domain resolution.

## Release validation before publication

TypeScript passed. The focused website and domain regression cluster passed 15 of 15 tests across three files. A fresh production build passed. Checkpoint `63aac211` was created for publication.

## Post-publication evidence and remaining check

The public document advanced to a new bundle (`assets/index-WOp2mdtr.js`), and that served bundle contains the `www.nsos.top` platform-domain exception. Browser resource inspection confirmed that same new bundle was executing, so this was not a stale application shell.

The remaining fallback came from a second platform-host guard inside `Home.tsx`. The top-level router correctly selected `Home`, but `Home` had a separate older `isNsosPlatformHost` implementation that did not recognise the NSOS custom domains and returned `DomainSchoolWebsite` again. The repair centralizes platform-host recognition in `client/src/lib/platformHost.ts`, which both `App.tsx` and `Home.tsx` now use. An executable regression confirms that `nsos.top`, `www.nsos.top` (case-insensitively), and managed platform hosts are product hosts, while an external school domain is not. The delivery-tracker item remains open until the revised bundle is live-validated.

## Live validation

After checkpoint `dc9b7902` propagated, the managed platform domain, `nsos.top`, and `www.nsos.top` served the same new production bundle (`assets/index-DV4chr5i.js`). A cache-busted browser visit to `https://nsos.top/` rendered the NSOS product entry and its sign-in choices, with title `NSOS — Nigerian School Operating System`; the `School website unavailable` fallback was absent. A separate cache-busted visit to `https://www.nsos.top/` redirected to `https://nsos.top/` and rendered the same NSOS product entry. The tester-facing routing incident is therefore resolved without altering any tenant school publication state.
