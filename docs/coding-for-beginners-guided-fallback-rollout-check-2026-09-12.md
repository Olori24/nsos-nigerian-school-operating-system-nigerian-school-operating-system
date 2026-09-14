# Coding for Beginners Guided Fallback Rollout Check

## Published change

Checkpoint `2072f91a` contains the deterministic Course Studio guided-fallback control and passed full source validation before publication.

## Production observation

During the first authenticated owner-workspace refresh, the existing Course Studio view did not yet expose the new **Build guided offline draft** control. A cache-busting reload was then started and was still in the application-loading state at the time of this record.

After the cache-busting reload completed, the owner returned to **Programmes** and the protected learning-operations workspace was loading. No fallback control interaction or other consequential action occurred while the workspace was loading.

## Browser cache diagnosis

The loaded owner session did not contain the guided-fallback label and reported an active `https://nsos.top/sw.js` service worker. Its loaded learning-operations asset had a different content hash from the locally validated build. This indicates that the browser session is still serving a previous client bundle rather than that the guided-fallback source change is absent from the validated build.

The sandbox browser service-worker registration and one cache were then cleared locally. The automatic reload ended at `about:blank`; no server-side action, material, account, invitation, or message was created. The owner workspace must be reopened before the current bundle can be verified.

Following the successful deployment of checkpoint `9e318643`, a fresh cache-busting owner-session load completed successfully. The protected **Programmes** workspace still needs a separate current-bundle check; no course-material or invitation action has been taken.

The fresh **Programmes** check then showed the **Build guided offline draft** control and its explicit no-provider, no-persistence notice. The approved Coding for Beginners brief, eight-week duration, live-online delivery mode, WAT timetable, and accessibility guidance were entered for a review-only outline; it has not been generated or saved at this point.

The deterministic guided outline then rendered successfully. It is explicitly marked non-persistent and requires a separate confirmation before internal drafts can be saved. Its baseline has three generic review-first modules, so it requires owner-reviewed tailoring to the requested eight-week Coding for Beginners progression before any save should be considered.

## Boundary

No Course Studio draft was saved, and no programme, material, pathway, learner enrolment, invitation, account, payment, message, grade, certificate, or public content was created during this rollout check.
