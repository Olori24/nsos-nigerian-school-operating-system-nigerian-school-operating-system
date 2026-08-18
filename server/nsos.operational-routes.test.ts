import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getSchoolMembership: vi.fn(),
  recordAttendance: vi.fn(),
  getAssessment: vi.fn(),
  listGradeScales: vi.fn(),
  upsertScore: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const teacherContext = (): TrpcContext => ({
  user: { id: 7, openId: "teacher-7", name: "Mrs. Ade", email: "teacher@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("NSOS operational routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 1, schoolId: 1, userId: 7, role: "teacher", status: "active", createdAt: new Date(), updatedAt: new Date() });
  });

  it("records attendance with the authenticated staff member as the recorder", async () => {
    vi.mocked(db.recordAttendance).mockResolvedValue({ success: true });
    const caller = appRouter.createCaller(teacherContext());

    await expect(caller.nsos.attendance.record({ schoolId: 1, attendeeType: "student", studentId: 22, attendanceDate: "2026-08-18", status: "present" })).resolves.toEqual({ success: true });
    expect(db.recordAttendance).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 1, studentId: 22, recordedBy: 7 }));
  });

  it("prevents score entry beyond the configured assessment maximum", async () => {
    vi.mocked(db.getAssessment).mockResolvedValue({ id: 3, schoolId: 1, maximumScore: 20 } as any);
    const caller = appRouter.createCaller(teacherContext());

    await expect(caller.nsos.results.enterScore({ schoolId: 1, assessmentId: 3, studentId: 22, score: 21 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.upsertScore).not.toHaveBeenCalled();
  });

  it("computes a grade and records the authenticated teacher for valid score entry", async () => {
    vi.mocked(db.getAssessment).mockResolvedValue({ id: 3, schoolId: 1, maximumScore: 50 } as any);
    vi.mocked(db.listGradeScales).mockResolvedValue([{ label: "A", minPercentage: 70, maxPercentage: 100, remark: "Excellent" }] as any);
    vi.mocked(db.upsertScore).mockResolvedValue({ percentage: 76, grade: "A" });
    const caller = appRouter.createCaller(teacherContext());

    await expect(caller.nsos.results.enterScore({ schoolId: 1, assessmentId: 3, studentId: 22, score: 38 })).resolves.toEqual({ percentage: 76, grade: "A" });
    expect(db.upsertScore).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 1, studentId: 22, enteredBy: 7, percentage: 76, grade: "A" }));
  });
});
