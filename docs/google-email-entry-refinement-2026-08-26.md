# Google and Email Entry Refinement — 26 August 2026

## Scope

The public NSOS sign-in surface is being simplified to two user-facing choices: Google OAuth and a passwordless email link. The legacy Manus-only button and its account wording are removed from the public entry. This is a presentation and public-entry change only; it does not remove the managed project infrastructure or alter the existing Google OAuth state binding, email verification controls, tenant access checks, or session protections.

## Mobile-first refinement

The tester screenshot showed the sign-in card competing with an optional install prompt and theme toggle. The public entry now keeps its mobile hierarchy focused on the two authentication choices. Nonessential PWA install, service-worker update, and theme controls are suppressed while an unauthenticated visitor is on the NSOS root entry. They remain available after authentication and elsewhere in the application. The install prompt delay is also extended from eight to fifteen seconds where it is eligible.

## Validation boundary

The related regression verifies that the public entry contains the Google and email-link controls, no longer contains the legacy Manus account wording or login helper invocation, and preserves the delayed install-prompt guard. Google and email routes retain their existing server-side security policies and will be validated separately through TypeScript, focused tests, build output, and anonymous sign-in-boundary checks.
