# NSOS Developer Arsenal

**Status:** Engineering foundation. This document defines a reusable decision and delivery standard; it does not certify a provider, backup, recovery, capacity, or security outcome.

## Purpose

The Developer Arsenal is NSOS’s internal reuse and engineering-decision system. Before introducing a new library, provider, workflow, or open-source building block, a change must first identify existing NSOS capability, assess safe reuse, and preserve the Nigerian learning-institution domain logic already held by NSOS.

| Decision stage      | Required evidence                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Need                | A concrete product or operational requirement, owner, scope, and affected roles.                                                 |
| Existing capability | A repository and product-surface review showing whether NSOS already solves the need.                                            |
| Candidate review    | Maintenance, security, licence, integration fit, performance, cost, operational burden, and exit path.                           |
| Integration         | Explicit provider abstraction where practical; tenant scope, role authorization, validation, auditability, and failure behavior. |
| Delivery            | Focused regression coverage, full release checks, operator documentation, and limitations stated honestly.                       |

## Reuse policy

NSOS prefers reuse only when it is compatible with the stack and provides a clear operational benefit. Generic libraries may supply primitives, but they never replace NSOS academic, admissions, finance, approval, learner-lifecycle, tenant-isolation, or Nigerian operating logic.

External providers for payments, messaging, storage, email, and AI remain behind explicit boundaries. A provider integration must not silently activate a delivery, payment, public publication, credential, or high-impact database change.

## Foundation status

The repository baseline includes CI, dependency auditing, security-workflow definitions, a manually approved isolated staging-health workload definition, engineering policy documents, and the `pnpm arsenal:audit` repository check. Workflow registration or file presence is not evidence that a remote workflow has completed successfully. Actual backup, restoration, capacity, provider, and production-health claims remain subject to their own evidence records.

## Licence decision

`package.json` currently declares MIT, but the repository does not yet contain an owner-approved licence text. The declared package value must not be treated as a legal publication decision. Confirm the intended repository licence and add the corresponding approved licence text before representing the project as licensed for external reuse.
