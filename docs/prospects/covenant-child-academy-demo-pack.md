# Covenant Child Academy — NSOS Management Demonstration Pack

**Status:** PROPOSED — sales enablement document only  
**Prepared:** 2026-11-03  
**Prospect:** Covenant Child Academy, Lagos  
**Contact status:** Initial enquiry acknowledged by the school’s automated response; no confirmed buying interest or meeting yet.  
**Scope:** A tailored, no-production-data management demonstration. This document does not create a school tenant, import records, configure providers, publish content, or contact the prospect.

## 1. Prospect snapshot

Public information on the school’s website describes:
- A Christian private-school organisation with Surulere and Awoyaya-Lekki campuses.
- Montessori pre-school, primary and secondary/college pathways.
- A stated scale of more than 1,363 students and 161 staff; treat these as the school’s own published figures, not independently audited current counts.
- An established history dating to 2000 and an emphasis on academic development, character and leadership.
- Existing investment in ICT and digital learning. Public references also point to an existing CBT arrangement at the Lekki campus.

**Commercial implication:** Lead with visibility and coordination across campuses, not a claim that NSOS replaces every system already in use. In particular, do not position NSOS as a replacement for the school’s existing CBT before discovery.

**Public sources to recheck before external use:**
- https://covenantchildacademy.com/
- https://covenantchildacademy.com/about-us/
- https://covenantchildacademy.com/contact/
- https://covenantchildacademy.com/faqs/
- https://covenantchildacademy.com/our_team/

## 2. Recommended entry point

Request a short management discovery and demonstration with the Project Director/CEO or a delegated school administrator. The school’s public team page identifies Dr Mrs Delight Olise as Project Director/CEO; verify the current role and preferred form of address before sending a personalised message.

The first meeting should not be a feature dump. It should establish:
1. How Surulere and Lekki currently coordinate academic and administrative information.
2. Which existing systems are authoritative for admissions, student records, fees, attendance, results, CBT and parent communication.
3. Where staff duplicate work or management lacks timely visibility.
4. Which one workflow would make a controlled pilot worthwhile.

## 3. Proposed 20-minute demonstration

| Time | Demonstration | Buyer question answered |
|---|---|---|
| 0–3 min | School owner dashboard and institution context | Can management see the key operating areas without chasing separate reports? |
| 3–6 min | Campus/class academic structure and role boundaries | Can each campus operate its workflows while management retains appropriate oversight? |
| 6–9 min | Admissions review and enrolment handoff | Can an enquiry/application move through a traceable review process? |
| 9–12 min | Fee structures, invoices, receipts and Cash Assurance review | Can finance distinguish paid, outstanding, disputed and awaiting-evidence items? |
| 12–15 min | Attendance, assessment/result approval and guardian visibility | Can staff capture activity while parents see only approved information for linked wards? |
| 15–18 min | Announcements, communication status and owner exceptions | Can management identify unresolved work and distinguish submitted messages from confirmed delivery? |
| 18–20 min | Discovery recap and pilot decision | Which workflow should be tested first, and who owns the decision? |

**Important:** Demonstrate only screens and workflows that are actually available in the current environment. If a workflow, provider, integration or production control is not verified, label it clearly as a planned/configuration-dependent step rather than presenting it as live.

## 4. Safe demo data model

Use an isolated, non-production demo workspace only if its creation and isolation are verified. If no isolated workspace is available, use a guided screen tour with no writes.

Permitted illustrative labels:
- Campus A — Surulere (illustrative)
- Campus B — Awoyaya-Lekki (illustrative)
- Sample Primary Class, Sample JSS Class, Sample SSS Class
- Demo Staff 01, Demo Guardian 01, Demo Learner 01
- Synthetic fee, attendance, application and announcement records clearly marked **DEMO**

Do not:
- Create a tenant under the school’s real name without authorisation.
- Copy the school’s student/staff names, phone numbers, emails, photographs, records or financial data.
- Upload real admissions documents or parent communications.
- Connect school payment, SMS, email, domain or other provider accounts.
- Publish demo admissions, websites, messages, results or announcements.
- imply the school is already a customer, partner or pilot participant.

## 5. Discovery questions

### Systems and workflow
1. Which platform currently holds the official student register?
2. Are Surulere and Lekki on one management system or separate systems?
3. Which system handles CBT, and what data (if any) needs to remain there?
4. How are admissions enquiries reviewed and converted into enrolments?
5. How do finance staff reconcile fees, transfers, receipts and outstanding balances?
6. How are attendance, assessment results and parent updates shared today?

### Decision and pilot
7. Which workflow currently consumes the most staff time?
8. Who would own a pilot operationally: management, ICT, academics, admissions or finance?
9. Which campus or department would be safest for a limited first test?
10. What security, data-protection, integration and support requirements must be satisfied before any real records are used?

Do not request learner or parent data during the first meeting.

## 6. Pilot proposal — subject to readiness and written agreement

**Commercial offer:** NSOS is offering eligible schools the first three months free. Confirm the exact start date, included modules, support scope, data responsibilities and any post-trial pricing in writing before onboarding.

Recommended sequence:
1. Discovery and workflow mapping.
2. Written pilot scope, named school owner and acceptance criteria.
3. Isolated configuration review with synthetic records.
4. School-side security, role and workflow validation.
5. Only after approval, a limited authorised pilot using the minimum school-approved data.
6. Weekly review and a documented go/no-go decision before expansion to the second campus.

A pilot must not begin with a bulk import. Start with the smallest useful workflow and a named school-side data owner.

## 7. NSOS readiness boundaries to disclose internally

The repository’s latest readiness snapshot (2026-10-10) says NSOS is conditionally ready for controlled private school use, not cleared for unrestricted onboarding or a 50,000-user capacity claim. The following remain unverified or incomplete in that snapshot:
- Isolated staging and provider-stub evidence.
- Hosted observability and actionable alert evidence.
- Critical end-to-end role journeys.
- Backup restore and migration/redeploy rollback rehearsal.
- Measured workload capacity.
- Verified transactional sender domain and delivery evidence.

Do not promise 50K-user capacity, full production readiness, verified integrations, or guaranteed outcomes. Any real-school pilot must remain within the approved controlled-use boundary and the current production launch gate (GitHub issue #39).

## 8. Follow-up sequence

**After acknowledgement:** Thank the school for acknowledging the enquiry and request a suitable time for a brief management discovery/demo. Do not assume the auto-reply means interest.

**After the meeting:** Send a one-page summary of the school’s stated workflow pain, the proposed pilot scope, responsibilities, exclusions and acceptance criteria.

**If no reply:** Send one concise follow-up after a reasonable interval, then pause rather than repeatedly messaging.

## 9. Meeting success criteria

The meeting is successful if:
- A relevant decision-maker or delegate attends.
- The school identifies one material workflow problem.
- Existing systems and integration constraints are understood.
- A campus/department and school-side owner are identified for possible discovery.
- The school agrees to a next meeting or explicitly declines.

A demonstration viewed is not a pilot approval. A pilot approval is not a production go-live.

## 10. Handoff

- **Status:** PROPOSED
- **Scope:** Prospect-specific sales enablement and safe demo plan only.
- **Files:** `docs/prospects/covenant-child-academy-demo-pack.md`
- **Tests:** Documentation-only; no application code or runtime behavior changed.
- **Evidence:** Public school website pages listed above; NSOS readiness snapshot and launch-gate issue #39.
- **Blockers:** No confirmed meeting, no isolated demo tenant verified, and production readiness gates remain open.
- **Next action:** Obtain a management meeting; then conduct discovery before creating any prospect-specific tenant or using any school data.
- **Do not infer:** Buying intent, customer status, integration compatibility, current student/staff counts, production readiness or capacity.
