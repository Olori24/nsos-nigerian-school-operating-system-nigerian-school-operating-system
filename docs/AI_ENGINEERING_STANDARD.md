# NSOS AI Engineering Standard

AI may propose, summarize, classify, draft, and produce bounded structured output. Deterministic server-side logic remains responsible for authorisation, tenant scope, schema validation, confirmation gates, idempotency, audit events, and every consequential mutation.

| Control               | NSOS expectation                                                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider boundary     | AI providers are accessed through explicit application boundaries rather than embedded directly in business workflows.                              |
| Output                | Structured output is allowlisted and validated before it is displayed or applied.                                                                   |
| High-impact activity  | An AI result never silently publishes content, sends a message, creates a payment, changes access, issues a credential, or alters learner outcomes. |
| Observability         | Record safe timing, failure, and cost/usage evidence where available without logging secrets or unnecessary personal data.                          |
| Regression protection | Include deterministic tests for failure handling, role scope, tenant isolation, and output validation.                                              |

Model output is assistance, not authority. A human reviewer remains accountable for education, safeguarding, finance, access, and communications decisions.
