# NSOS AI-Visibility Implementation — 21 September 2026

## Outcome

NSOS now has a public, crawlable information architecture on `nsos.top` and `www.nsos.top`. The implementation explains the product in terms that are useful to school owners, Nigerian school operators, families, and answer engines. It keeps the authenticated application and tenant school records outside the public information boundary.

The implementation is **content and technical discoverability work**, not a claim that a search engine has already indexed or ranked the pages. External indexing, answer-engine citations, traffic, leads, customer counts, and search performance remain unverified until independent measurement is available.

## Public information architecture

The public site includes the following routes:

- `/` — NSOS overview.
- `/about` — product identity, audience, and accountability model.
- `/school-management-software` — connected school administration software.
- `/school-management-system-nigeria` — Nigeria-first operating context.
- `/for-schools` — owner, administrator, teacher, family, and learner use cases.
- `/ai-for-schools` — supervised AI with human approval boundaries.
- `/school-administration` — setup, records, staff, finance, and operational review.
- `/student-management` — admissions, learner records, guardians, and protected access.
- `/academic-management` — sessions, terms, classes, subjects, curriculum, and delivery.
- `/school-fees-management` — fee structures, invoices, receipts, balances, and provider gates.
- `/school-attendance-management` — attendance capture, summaries, and human follow-up.
- `/school-results-management` — assessment, grade computation, approval, and report cards.
- `/parent-portal` — permitted family views and safe onboarding.
- `/school-communication` — targeted, reviewable communication workflows.
- `/faq` — factual product and school-digitisation questions.
- `/contact` — safe next steps for schools and families without inventing a general mailbox.

Each page has a focused title, description, canonical URL, Open Graph and Twitter metadata, a breadcrumb, and structured data appropriate to the page. The FAQ page includes `FAQPage` data. Product pages include `Service` data. The public root includes organization, website, and software-application identity data.

The public navigation links the high-value pages together. The content avoids unsupported customer counts, rankings, awards, accreditation, partnerships, revenue, valuation, fundraising, and outcome claims.

## Discovery files

The public domain exposes:

- [`robots.txt`](../client/public/robots.txt), which allows public content and disallows API and private application paths.
- [`sitemap.xml`](../client/public/sitemap.xml), which lists only the approved static public routes.
- [`llms.txt`](../client/public/llms.txt), which states the official NSOS identity, product scope, audience, public resources, and accuracy limits.

The Express application also registers host-aware responses for these paths. `nsos.top` and `www.nsos.top` receive the public discovery content. Other hosts receive a deny-all robots response or no sitemap response, which prevents managed previews and unrelated custom domains from being treated as the NSOS corporate public site.

## Routing and privacy safeguards

The NSOS-owned domains route public marketing paths to the public site. Existing `/school/:shortCode` and `/apply/:shortCode` routes remain available on the NSOS-owned domains. Custom school domains continue to resolve through the existing public-domain website path. Unknown paths on the NSOS-owned domains resolve to the public not-found experience rather than the authenticated workspace.

Public school website responses no longer spread complete database rows into the anonymous response. The serializer now returns only the approved public school fields, approved public website copy and theme fields, selected public media URLs, and the admissions URL. It excludes internal identifiers, creator fields, domain-verification tokens, publication controls, media identifiers, and unrelated tenant configuration.

Public admissions pages receive `noindex, follow` metadata because they are transaction forms rather than durable product-information pages. Public school pages receive school-specific metadata while private workspace pages remain behind the application’s existing authentication and robots boundaries.

## Source files

The implementation is centred in:

- `client/src/pages/PublicMarketingPage.tsx`
- `client/src/pages/PublicLanding.tsx`
- `client/src/lib/publicMetadata.ts`
- `client/src/lib/platformHost.ts`
- `client/src/App.tsx`
- `client/src/pages/SchoolWebsite.tsx`
- `client/src/pages/DomainSchoolWebsite.tsx`
- `client/src/pages/PublicAdmissions.tsx`
- `server/public-discovery.ts`
- `server/db/core.ts`
- `client/index.html`

The privacy and visibility regressions are covered by `server/public-website-privacy.test.ts` and `server/public-visibility-ui.test.ts`. Existing source-sensitive tests were made formatting-safe where the additive routing and metadata work changed line wrapping.

## Verification

The completed source validation produced the following evidence:

| Check                                 | Result                                                      |
| ------------------------------------- | ----------------------------------------------------------- |
| Full Vitest suite                     | 141 test files passed; 524 tests passed; 1 intentional skip |
| TypeScript                            | Passed                                                      |
| Lint                                  | Passed                                                      |
| Production build                      | Passed                                                      |
| Prettier                              | Passed for changed files                                    |
| `git diff --check`                    | Passed                                                      |
| Public serializer privacy regression  | Passed                                                      |
| Public route and discovery regression | Passed                                                      |

These results verify the repository implementation. They do not verify external search-engine indexing, search ranking, answer-engine citation, conversion, or uptime on third-party infrastructure.

## References

[1]: https://nsos.top/ "NSOS public website"
[2]: https://nsos.top/sitemap.xml "NSOS public sitemap"
[3]: https://nsos.top/llms.txt "NSOS public llms.txt entity file"
[4]: https://www.nsos.top/ "NSOS www public website"
