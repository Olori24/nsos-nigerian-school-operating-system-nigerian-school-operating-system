# NSOS AI Engineering Standard

## Objective

AI must improve school operations without becoming an uncontrolled source of institutional state changes, privacy leakage, vendor lock-in, or unpredictable spend.

## Provider boundary

All server-side model access goes through the existing LLM boundary (`server/_core/llm.ts`). Feature modules should not call model vendors directly.

This boundary provides a stable place for:

- authentication
- model selection
- structured output
- tool definitions
- timeout/retry behaviour
- provider migration
- usage/cost telemetry
- future model routing

## Evaluation requirement

Every consequential AI capability must have deterministic evaluation fixtures before release.

Minimum fixture classes:

1. happy-path request
2. malformed/ambiguous request
3. permission-boundary request
4. tenant-isolation request
5. prompt-injection attempt
6. sensitive-data request
7. tool misuse attempt
8. provider failure/timeout
9. structured-output violation
10. high-cost/repeated-request scenario

## Authority model

AI output is classified as one of:

- **advisory** — explanation or recommendation only
- **draft** — prepares content for human review
- **validated action** — deterministic server validation passes before mutation
- **blocked** — policy, permission, safety or validation prevents execution

AI never bypasses existing RBAC, tenant isolation, approval boundaries, audit controls, payment controls, or destructive-operation safeguards.

## Cost controls

AI calls should define:

- model
- maximum output budget
- timeout
- retry policy
- expected invocation frequency
- cacheability
- fallback behaviour
- failure behaviour

Avoid autonomous retry loops and uncontrolled background generation.

## Privacy

Prompts must contain the minimum information required for the task. Never expose secrets, authentication tokens, unrelated tenants, or raw sensitive records merely because a model can process them.

## Release gate

A new AI capability is production-ready only when its evaluation fixtures pass, permission boundaries are tested, failure behaviour is deterministic, and expected operating cost is understood.
