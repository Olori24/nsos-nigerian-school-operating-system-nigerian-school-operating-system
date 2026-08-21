import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const reviewDesk = readFileSync(resolve(root, "client/src/components/TeacherWeeklyPlanReview.tsx"), "utf8");

describe("teacher revised-plan notification filters", () => {
  it("offers all, unread, and read filters plus an accessible subject selector", () => {
    expect(reviewDesk).toContain('type NotificationStateFilter = "all" | "unread" | "read"');
    expect(reviewDesk).toContain('aria-label="Filter alert status"');
    expect(reviewDesk).toContain("Unread ({unreadAlertCount})");
    expect(reviewDesk).toContain("Read ({alerts.length - unreadAlertCount})");
    expect(reviewDesk).toContain("All subjects");
  });

  it("keeps filtering local to the already teacher-scoped alert data and shows an explicit empty state", () => {
    expect(reviewDesk).toContain("const filteredAlerts = alerts.filter");
    expect(reviewDesk).toContain('subjectFilter === "all" || alert.subjectLabel === subjectFilter');
    expect(reviewDesk).toContain("No revised-plan alerts match these filters.");
  });

  it("shows teacher-owned pin controls and preserves pinned-first priority order inside filtered alerts", () => {
    expect(reviewDesk).toContain("setSchemeRevisionNotificationPinned.useMutation");
    expect(reviewDesk).toContain("pinnedAlertCount");
    expect(reviewDesk).toContain("Pinned priority");
    expect(reviewDesk).toContain("alert.pinnedAt ?");
    expect(reviewDesk).toContain("Pin high-priority items to keep them at the top of every filtered view.");
  });

  it("distinguishes a leader recommendation from a teacher-owned priority pin", () => {
    expect(reviewDesk).toContain("Leader recommended");
    expect(reviewDesk).toContain("This recommendation does not change your personal pins or approval decision.");
  });
});
