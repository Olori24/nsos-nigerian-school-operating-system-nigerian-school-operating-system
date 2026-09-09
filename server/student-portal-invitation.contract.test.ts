import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("student portal invitation contract", () => {
  it("uses an expiring draft-to-send lifecycle with tenant-scoped duplicate and identity safeguards", () => {
    const schema = source("drizzle/schema/core.ts");
    const db = source("server/db/core.ts");
    expect(schema).toContain("export const studentPortalInvitations");
    expect(schema).toContain('"draft",');
    expect(schema).toContain('"sending",');
    expect(schema).toContain('"sent",');
    expect(schema).toContain('"failed",');
    expect(schema).toContain('"accepted",');
    expect(schema).toContain('"expired",');
    expect(db).toContain("STUDENT_PORTAL_INVITATION_TTL_MS");
    expect(db).toContain("This student already has a linked portal account.");
    expect(db).toContain(
      "This email address is already recorded for another student in this school."
    );
    expect(db).toContain("isNull(studentProfiles.userId)");
    expect(db).toContain('role: "student", status: "active"');
  });

  it("requires confirmed owner/admin preparation and a separate sender-gated confirmed delivery", () => {
    const router = source("server/routers/nsos.ts");
    expect(router).toContain(
      "prepareStudentPortalInvitation: onboardingAdminProcedure"
    );
    expect(router).toContain(
      "sendStudentPortalInvitation: onboardingAdminProcedure"
    );
    expect(router).toContain("confirmed: z.literal(true)");
    expect(router).toContain('namespace: "student-portal-invitation"');
    expect(router).toContain("getStudentRecordEmailSenderReadiness()");
    expect(router).toContain("markStudentPortalInvitationDelivery");
    expect(router).toContain('status: "failed"');
  });

  it("accepts a sent invitation only after verified passwordless email sign-in and exposes an owner/admin-only UI", () => {
    const auth = source("server/auth.ts");
    const home = source("client/src/pages/Home.tsx");
    const panel = source("client/src/components/StudentPortalAccessPanel.tsx");
    expect(auth).toContain("acceptStudentPortalInvitationsForVerifiedEmail");
    expect(auth).toContain("sendStudentPortalInvitationEmail");
    expect(home).toContain('id="student-portal-access"');
    expect(home).toContain('role === "owner" || role === "admin"');
    expect(panel).toContain("Prepare invitation");
    expect(panel).toContain("Final delivery confirmation");
    expect(panel).toContain("reviewInvitationId");
    expect(panel).toContain("sendConfirmedFor");
    expect(panel).toContain("seven days");
  });
});
