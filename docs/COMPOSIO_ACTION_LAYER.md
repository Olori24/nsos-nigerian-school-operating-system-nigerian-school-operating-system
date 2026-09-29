# NSOS Composio Action Layer

NSOS keeps **Resend as the email/transactional communication provider**. Composio is an additional external-action adapter; it does not replace or modify the existing Resend event pipeline.

## Architecture

```
NSOS business logic
      |
      +---- Resend ------> lead nurture / transactional email
      |
      +---- Composio ----> external app actions
```

The adapter lives in `server/composio.ts` and uses Composio's v3.1 tool execution API.

## Environment

Add these server-side secrets/configuration:

- `COMPOSIO_API_KEY` — Composio project API key.
- `COMPOSIO_USER_ID` — stable NSOS/tenant-scoped Composio user identifier.
- `COMPOSIO_CONNECTED_ACCOUNT_ID` — optional default connected-account ID.
- `COMPOSIO_TOOL_VERSION` — optional pinned tool version. Pin this for deterministic production integrations.

Never expose the Composio API key to client-side code.

## Execution contract

`executeComposioAction({ toolSlug, arguments, ... })` executes a server-side Composio tool. Provider OAuth/API credentials remain inside Composio.

For multi-tenant NSOS, supply a tenant-scoped `userId` and the appropriate connected account. Do not use one personal account for every school.

## Safety rules

1. Keep Resend unchanged.
2. Invoke Composio only from trusted server-side code.
3. Validate tool and arguments before execution.
4. High-impact operations require an NSOS approval boundary.
5. Do not blindly retry non-idempotent external writes.
6. Persist a correlation/event ID around each external action so duplicate delivery can be detected.
7. Prefer pinned Composio tool versions for deterministic workflows.

## First rollout

Start with a low-risk school onboarding action such as creating an external workspace or recording an onboarding audit entry. Then add Google Workspace, Slack, CRM, calendar, or other toolkits one at a time.

This integration layer does **not** change Resend behavior and does not automatically execute an external action until a Composio connection and explicit workflow wiring are configured.
