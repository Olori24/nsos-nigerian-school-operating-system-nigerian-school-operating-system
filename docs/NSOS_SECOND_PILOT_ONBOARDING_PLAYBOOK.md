# NSOS Second-Pilot Onboarding Playbook

**Purpose.** This playbook tests the reusable `nsos-school-platform-launch` skill against a **hypothetical second Nigerian pilot school**. It deliberately uses placeholders only; it does not create learner, parent, staff, payment, or admissions data.

> **Pilot promise:** NSOS should help the school see what it is owed, keep parents informed, and give the owner a short daily view of exceptions that require attention.

## 1. Pilot Definition and Success Criteria

| Item | Decision for Pilot School B |
| --- | --- |
| Tenant | Create a new, empty school tenant with its own `schoolId`; do not reuse another school’s records or provider configuration. |
| Operating defaults | NGN, Africa/Lagos, selected Nigerian state, school-owned academic sessions and terms. |
| Initial commercial wedge | **Cash and Parent Trust**: admission conversion, fees and receipts, attendance visibility, parent communications, and owner exceptions. |
| Pilot period | First academic setup through a controlled 30-day operational launch. |
| Minimum proof | One end-to-end, authorised workflow from public application to review, enrolment confirmation, invoice, receipt, attendance, and parent-visible update. |
| Data rule | Use authorised data only after the school accepts the rollout and identifies its data owner. Start with configuration and approved internal test accounts. |

The pilot is successful when the owner can identify outstanding balances, admissions requiring action, material attendance exceptions, and failed communication delivery without reconciling multiple spreadsheets or chats.

## 2. Discovery Session: Questions Before Configuration

Conduct one owner-led discovery session before importing or entering records. The aim is to establish the operating model, not to collect personal data prematurely.

| Question | Decision it unlocks | Owner of answer |
| --- | --- | --- |
| Which classes, sessions, terms, subjects, and fee categories operate today? | Academic, class, and finance configuration. | Owner or academic lead |
| How does a family move from enquiry to application, decision, and enrolment? | Public admissions and reviewer workflow. | Admissions lead |
| Which fee issues consume the most staff time? | Invoice, balance, receipt, and follow-up prioritisation. | Finance lead |
| Which updates do parents request most often? | Parent portal and communication priority. | Owner or customer-facing staff |
| Which actions need owner approval? | Roles, permission boundaries, audit coverage, and exception brief. | Owner |
| Which payment and notification providers already exist? | Provider configuration, test connection, and webhook requirements. | Owner or finance lead |
| What must never be visible publicly? | Public website and admissions publication boundaries. | Owner |

At the end of discovery, create a one-page operating map: **public application → review → decision → enrolment → invoice → payment/receipt → class attendance → results → parent communication**.

## 3. Role and Access Setup

Invite only authorised pilot staff. Every account has a named owner and a purpose; no shared accounts are permitted.

| Role | Pilot responsibilities | Must not do |
| --- | --- | --- |
| School owner/admin | Configure school, memberships, website, providers, reports, and approval rules. | Receive raw provider secrets in chat or grant broad access without a business reason. |
| Admissions staff | Review applications, request missing documents, record decisions. | Publish results, change fees, or access unrelated finance records. |
| Finance staff | Create fees/invoices, record payments, issue receipts, follow balance follow-up. | Change tenant, domain, or provider controls. |
| Teacher | Capture attendance, lesson coverage, scores, and result-readiness data. | Publish unapproved results or access unrelated family finances. |
| Parent/guardian | View linked wards’ permitted attendance, published results, fee information, and announcements. | View other learners or internal school operations. |

## 4. 30-Day Onboarding Sequence

### Days 0–3: Establish a Safe, Empty Tenant

Create the school profile, state, school code, academic year, session, term, classes, subjects, and authorised memberships. Configure only approved school branding and public website content. Keep public admissions unpublished until the owner reviews the form, declaration, required documents, and contact-routing approach.

**Exit check:** the owner/admin can sign in, see only this school, assign roles, and confirm that no real family data has been entered accidentally.

### Days 4–7: Build the Cash-Assurance Workflow

Define fee structures, invoice rules, receipt process, balance review cadence, and the person responsible for each unpaid-fee follow-up. Configure a payment provider only where the school has supplied approved credentials; otherwise use the manual payment-confirmation path with an auditable review process.

Test a controlled internal journey: fee → invoice → recorded payment → receipt → updated balance. Verify that the amount, actor, and state transition are visible and that no browser user can retrieve a provider secret.

**Exit check:** the finance lead can identify what is due, what is paid, what needs confirmation, and who owns the next follow-up action.

### Days 8–14: Launch Admissions and Parent Trust

Publish the school’s reviewed admissions page only when its information is intentional. Set the admissions review queue and decision status conventions. Configure one approved communication provider, test its connection, and send a consent-aware test message to an authorised number. Confirm that delivery is represented accurately as submitted, delivered, or failed.

Onboard a limited group of authorised pilot guardians only after relationship links have been reviewed. Parents should see only linked wards, published results, attendance, fees, and announcements.

**Exit check:** a submitted application reaches the protected review queue, and a guardian receives a traceable school update without visibility into other families’ information.

### Days 15–21: Prove Teaching and Attendance Control

Configure timetables, lesson planning expectations, attendance capture, score-entry rules, grade scales, and result approval. Assign responsibility for exceptions: which absences trigger contact, who approves results, and who resolves missing scores.

Test a controlled attendance and result route with authorised internal accounts. Confirm that results cannot be published until approval and that parent/student views expose only published information.

**Exit check:** leadership can see an attendance exception and an unapproved result as separate, actionable states.

### Days 22–30: Owner Review and Controlled Go-Live

Run the owner’s daily exception review. It should focus on the few issues needing action: unpaid high-priority invoices, payment exceptions, applications waiting too long, unusual absences, unapproved results, and failed parent communications. Review access logs, provider configuration state, and public website publication one final time.

Then conduct a short school-side role QA with the owner, admissions lead, finance lead, teacher, and one authorised guardian. Do not expand from pilot to all families until their feedback confirms that the workflows and communication wording are understood.

**Exit check:** the school owner accepts the pilot operating workflow and names the next cohort, module, or parent group to onboard.

## 5. Security and Integrity Gate

Do not call the pilot live until every item below is true.

| Gate | Verification |
| --- | --- |
| Tenant isolation | Each private action checks active membership and the school boundary on the server. |
| Permissions | Owner/admin, admissions, finance, teacher, parent, and student responsibilities are tested against unauthorised access. |
| Public safety | Admissions and public website pages reveal only intentionally published information. |
| Finance integrity | Amounts are validated, receipts/balances remain traceable, and material finance activity is audited. |
| Provider safety | Credentials are encrypted and hidden from browsers; connection and message tests use approved data only. |
| Delivery truth | Notification submission remains distinct from confirmed delivery; signed provider callbacks are verified before state changes. |
| Results safety | Result approval precedes publication; family views are relationship-scoped. |
| Release evidence | Typecheck, tests, production build, desktop/mobile visual review, and the school-side QA guide are complete. |

## 6. Owner’s Evidence of Value

The pilot should produce visible evidence rather than a generic feature tour.

| Buyer outcome | Evidence to show the school owner |
| --- | --- |
| Cash assurance | An outstanding-fee view with payment state, receipt/balance status, exception reason, and responsible follow-up. |
| Parent trust | A parent sees the correct ward only and receives a clear, traceable attendance, fee, result, or announcement update. |
| Owner control | A short exception list names the matter, impact, owner, and next action. |
| Staff accountability | A named staff workflow shows attendance, admissions, score, or approval responsibility and status. |
| Safe growth | Role boundaries, audit events, protected providers, and published-only public information are demonstrated. |

## 7. Pilot Handoff and Next Decision

At day 30, hold a 30-minute decision session with the school owner. Review the evidence above, the issues found, the staff effort saved, and the next growth step. Choose **one** next move: broaden to another class level, onboard an additional parent cohort, add a payment/notification provider, launch the public website/domain, or begin a second campus assessment.

Do not widen the rollout solely because the screens work. Widen it because the school can operate the workflow confidently and the security, data, and support boundaries have been verified.
