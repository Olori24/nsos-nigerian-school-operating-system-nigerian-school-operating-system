import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

describe("pre-deployment tenant security invariants", () => {
  it("never sends the session token from browser storage", () => {
    const source = readFileSync(resolve(root, "client/src/main.tsx"), "utf8");
    expect(source).not.toContain("sessionStorage.getItem(\"manus-cookie\")");
    expect(source).not.toContain("Authorization: `Bearer");
  });

  it("uses a lax HttpOnly session cookie", () => {
    const source = readFileSync(resolve(root, "server/_core/cookies.ts"), "utf8");
    expect(source).toContain('httpOnly: true');
    expect(source).toContain('sameSite: "lax"');
  });

  it("requires an explicit same-origin signal for state-changing requests", () => {
    const source = readFileSync(resolve(root, "server/security.ts"), "utf8");
    expect(source).toContain("if (!origin || !host) return false;");
  });

  it("passes tenant scope into cross-tenant-sensitive mutations", () => {
    const router = readFileSync(resolve(root, "server/routers/nsos.ts"), "utf8");
    const db = readFileSync(resolve(root, "server/db/core.ts"), "utf8");
    expect(router).toContain("db.publishAnnouncement(input.schoolId, input.announcementId)");
    expect(router).toContain("db.reviewLeaveRequest(");
    expect(db).toContain("ensureAnnouncementBelongsToSchool");
    expect(db).toContain("ensureLeaveBelongsToSchool");
    expect(db).toContain("ensureStaffBelongsToSchool");
    expect(db).toContain('eq(announcements.schoolId, schoolId)');
    expect(db).toContain('eq(leaveRequests.schoolId, schoolId)');
  });
});
