# Cash Assurance Phase 2 — Implementation Contract

**Status:** Engineering contract / branch preparation  
**Issue:** #52  
**Branch:** `feat/cash-assurance-reminder-governance`  
**Production status:** Not implemented or activated by this document.

This contract narrows Phase 2 to a supervised, provider-aware reminder workflow. It extends the existing Cash Assurance Phase 1 case/evidence/promise/dispute workflows and must not create a second finance ledger.

## 1. Existing integration points inspected

- `drizzle/schema/core.ts`: `cashAssuranceCases`, `cashAssuranceCaseInvoices`, `cashAssuranceEvents`, `paymentEvidence`, and `paymentPromises` exist.
- `server/routers/nsos.ts`: `nsos.cashAssurance.list`, `openCase`, `recordPromise`, `submitEvidence`, `reviewEvidence`, `recordDispute`, and `resolveDispute` are protected with `finance.read` / `finance.write`.
- `client/src/components/CashAssuranceWorkbench.tsx`: current finance workbench already reads the Cash Assurance data and exposes case, promise, evidence, and dispute workflows.
- The earlier product specification names `reminderPolicies` and `reminderRuns`, but those reminder tables are not present in the inspected schema excerpt. They must be added as a new additive migration, not assumed to exist.

## 2. Data model to implement

### `reminderPolicies`

Tenant-owned policy configuration:
- `id`, `schoolId`, `name`, `status` (draft/active/archived)
- `triggerType` (invoice_due/overdue/promise_due/evidence_received)
- `channel` (email/sms/whatsapp/in_app)
- `template` and immutable `templateVersion`
- `requiresApproval` (true by default; false must not be supported in Phase 2)
- `quietHoursStart`, `quietHoursEnd`, `timezone` (default `Africa/Lagos`)
- `createdBy`, `updatedBy`, timestamps

### `reminderRuns`

Durable per-recipient intent and delivery lifecycle:
- `id`, `schoolId`, `caseId`, `policyId`, `policyVersion`
- `recipientUserId` where an authenticated recipient exists; otherwise use a protected contact reference resolved server-side and never expose it to analytics
- `channel`, `status` (proposed/approved/submitted/delivered/failed/suppressed/cancelled)
- `messageLogId`, `idempotencyKey`, `scheduledAt`, `approvedBy`, `approvedAt`, `submittedAt`, `deliveredAt`, `failureCode`
- timestamps and indexes on `(schoolId,status)`, `(schoolId,caseId)`, and unique `(schoolId,idempotencyKey)`

Store a minimal content snapshot or versioned template reference sufficient for audit; do not duplicate full financial or learner records. If a rendered message must be retained, store it in the existing protected communication log under its existing retention controls, not product analytics.

## 3. State machine and invariants

Allowed transitions:
- proposed → approved | suppressed | cancelled
- approved → submitted | suppressed | cancelled
- submitted → delivered | failed
- failed → approved only through an explicit, bounded retry action with a new attempt key
- delivered, suppressed, and cancelled are terminal

Invariants:
1. `submitted` is never represented as `delivered`.
2. A run cannot be approved or submitted while its case is disputed, closed, settled, or paused.
3. No dispatch outside the school's configured channel, recipient preferences, legal-basis/consent policy, or local quiet hours.
4. No default or silent fallback to another channel.
5. No automatic ledger mutation: reminder lifecycle must not allocate payments, settle invoices, alter balances, issue credits, or write off debt.
6. Callback processing must verify provider signatures, enforce idempotency, and reject state downgrades.
7. Every read and mutation must be tenant-scoped and role-checked server-side.

## 4. Approval and recipient resolution

- Only a finance-authorised staff member may approve a single reminder or a clearly bounded batch.
- The approval preview must show school, case, invoice reference, amount due, recipient relationship, channel, template version, local send window, and message preview.
- Resolve recipient and destination server-side at approval/dispatch time. Do not accept arbitrary client-supplied phone numbers or email addresses.
- Guardian-facing content must be limited to the linked learner/account and must not expose another learner's records.
- Record opt-out, suppression, consent or other documented legal basis, source, and timestamp. If the required basis is missing or unclear, suppress and require administrator review.

## 5. Nigerian-market behavior

- Display all financial values in NGN using the existing finance formatting conventions.
- Interpret school quiet hours and due-date display in `Africa/Lagos`; persist event timestamps consistently in UTC.
- Support manual bank-transfer/cash evidence review through existing Phase 1 evidence workflows. Evidence submission is not payment confirmation.
- Provider readiness is channel-specific. A successful connection test is not proof of delivery. A channel without verified credentials and sender configuration must remain unavailable.
- Provide a visible, actionable explanation when no outbound provider is configured; retain in-app task visibility without pretending an external message was sent.

## 6. API and UI increments

Suggested protected procedures under `nsos.cashAssurance`:
- `listReminderPolicies` / `saveReminderPolicy` / `archiveReminderPolicy`
- `proposeReminder`
- `listReminderQueue`
- `approveReminder` and `approveReminderBatch` (bounded size, explicit confirmation)
- `cancelReminder`
- `retryReminder` (bounded, only after failure)
- provider callback endpoint outside the authenticated tRPC router, with signature verification and idempotent processing

The mobile-first workbench should show:
- proposed and awaiting-approval queue
- recipient and invoice context, message preview, channel readiness, and quiet-hours explanation
- submitted/delivered/failed/suppressed/cancelled status separately
- failed-delivery exception queue with source links and retry eligibility
- clear loading, empty, provider-unavailable, partial-failure, and permission-denied states

## 7. Required validation

- Schema/migration: additive migration, generated metadata snapshot, rollback/recovery plan.
- Authorization: cross-tenant denial; finance permission required for policy/approval/dispatch; guardian scope limited to linked records.
- Workflow: transition matrix, disputed/settled suppression, consent/opt-out, quiet hours, duplicate idempotency, bounded retry, callback signature rejection, callback replay, and delivery-state monotonicity.
- Financial integrity: before/after ledger snapshots prove that proposal, approval, dispatch, failure, callback, cancellation, and retry do not mutate invoices, payments, allocations, or balances.
- Privacy: tests prove that phone/email, message body, learner names, invoice amounts, bank details, and receipt contents are excluded from third-party product analytics and logs.
- UI: mobile and desktop approval/cancel/provider-unavailable states.
- Release: clean install, typecheck, lint, full tests, production build, synthetic staging with provider stubs only.

## 8. Explicitly not authorised

This branch does not authorise production migrations, real parent messaging, provider credential changes, DNS changes, payment configuration, automated/background sends, or changes to existing school records. Those require separate reviewed release steps and explicit approval.
