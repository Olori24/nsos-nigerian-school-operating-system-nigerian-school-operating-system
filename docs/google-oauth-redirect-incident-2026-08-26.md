# Google OAuth Redirect Incident — 26 August 2026

## Incident evidence

A tester reported Google Error 400, `redirect_uri_mismatch`, while starting NSOS Google sign-in. Read-only inspection of the live start endpoint confirmed that a sign-in initiated at `https://nsos.top` requests the callback `https://nsos.top/api/auth/google/callback`.

The live client ID used by that flow ends in `h87i27n1epo8hjequu9jeoc7ftca2sua.apps.googleusercontent.com`. Before the repair, its Google Cloud allowlist contained only the managed platform origin and callback:

| Allowlist class | Existing value |
| --- | --- |
| Authorized JavaScript origin | `https://nsos-system-uhkdscaf.manus.space` |
| Authorized redirect URI | `https://nsos-system-uhkdscaf.manus.space/api/auth/google/callback` |

This configuration did not include the live public NSOS callback. The application code derives the callback from the browser-provided, validated origin, so the public custom-domain callback was the correct value; no tenant publication or domain change was involved.

## Owner-approved repair and validation

After explicit owner confirmation, the existing client retained its managed platform origin and callback. The following two entries were added:

| Allowlist class | Added value |
| --- | --- |
| Authorized JavaScript origin | `https://nsos.top` |
| Authorized redirect URI | `https://nsos.top/api/auth/google/callback` |

Google Cloud displayed `OAuth client saved`. An anonymous request to the NSOS Google start endpoint then followed to Google’s account-selection page with status 200 and the expected `redirect_uri=https://nsos.top/api/auth/google/callback`; the returned page contained no `redirect_uri_mismatch` marker. No Google account was selected, no tester account was accessed, no client secret was rotated, and no consent-screen, domain/DNS, tenant, database, or deployment setting was changed.

`www.nsos.top` redirects to `nsos.top` before the application starts sign-in, so a separate `www` OAuth allowlist entry was not added.
