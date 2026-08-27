# Admission Completion Mobile UX Decision

**Scope:** This decision addresses the reported small-screen admission-completion view only. It does not alter admissions eligibility, enrollment mutation payloads, tenant filtering, record retrieval, PDF generation, protected-email confirmation, sender readiness, or delivery state.

## Observed Issue

The reported mobile view showed a completion dialog extending beyond the viewport while fixed application controls remained visually prominent. The completion information, action choices, and background interface competed for attention. The view also needed plainer copy that distinguishes the confirmed enrollment record from any later payment, document delivery, or email action.

## Design Decision

| Area | Decision | Reason |
| --- | --- | --- |
| Layering | Raise shared modal and alert-dialog layers above fixed application prompts and controls. | A modal must be the sole active surface while it is open. |
| Mobile height | Constrain dialog content to the visible dynamic viewport and allow internal vertical scrolling. | All completion actions and record details remain reachable on narrow, short screens. |
| Completion structure | Present one concise outcome statement, a labelled record switcher, a separate document-action group, and a factual record summary. | The user can distinguish viewing from exporting or sharing. |
| Action hierarchy | Keep record-view choices compact; move document actions into a labelled secondary group and make the unavailable email action explain its dependency. | Prevents visually equal controls from obscuring the primary next step. |
| Copy | Use action-oriented, factual language such as “Enrollment recorded” and “View confirmed record.” | Avoids implying payment completion, guaranteed delivery, or an active mailbox. |
| Record content | Render names only from the tenant-scoped completion query; do not introduce example learner or guardian data. | Preserves operational truthfulness and tenant boundaries. |
## Mobile Acceptance Criteria

The completion dialog must scroll within the viewport, remain above fixed theme/install/owner controls, expose a visible close control, retain keyboard focus behavior, and use an accessible live status while record data loads. The entry must continue to show actual tenant-scoped completion data only after the enrollment mutation succeeds. The share action must remain disabled until the existing sender and recipient evidence gate passes.
