# NSOS Client Delivery Standard

A feature is client-ready only when engineering quality and operational handover are both complete.

## Required evidence

- production build passes
- automated tests pass
- security gates pass
- migrations are reproducible
- authorization and tenant isolation are tested
- consequential actions are auditable
- external providers are documented
- backups/recovery expectations are documented
- staging verification is completed where risk warrants it
- performance assumptions are recorded
- known limitations are explicit
- release notes exist
- operator/admin guidance exists

## Client value report

Every major delivery should communicate:

- what business problem changed
- what users can now do
- reliability/security improvements
- operational cost implications
- what remains outside scope
- how the client can verify the result
- support/recovery path

## No false completion

A feature is not marked production-ready because a page renders successfully. Production readiness requires evidence across functionality, security, data integrity, operations and recovery.
