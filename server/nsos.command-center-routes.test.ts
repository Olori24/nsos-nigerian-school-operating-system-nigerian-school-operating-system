import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getSchoolMembership: vi.fn(),
  getOperationsCommandCenter: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const caller = () => appRouter.createCaller({ user: { id: 41, openId: "owner-41", name: "School Owner", email: "owner@example.ng", loginMethod: "email", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("NSOS Operations Command Center", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 3, schoolId: 7, userId: 41, role: "owner", status: "active", createdAt: new Date(), updatedAt: new Date() } as any);
    vi.mocked(db.getOperationsCommandCenter).mockResolvedValue({ onboarding: { completionPercent: 33 }, nextAction: { label: "Set up academics", destination: "academics", description: "Create the academic foundation." }, communications: { readyChannels: 1, channels: [{ channel: "in_app", configured: true }], email: { status: "awaiting_domain_verification", managedSenderNeedsVerification: true, failedCount: 0, acceptedCount: 0, launchChecklist: [] } }, migrations: { students: { completed: 1 }, staff: { completed: 0 }, academics: { completed: 2 } } } as any);
  });

  it("returns only the active owner/admin tenant aggregate", async () => {
    await expect(caller().nsos.operations.commandCenter({ schoolId: 7 })).resolves.toMatchObject({ onboarding: { completionPercent: 33 }, communications: { email: { managedSenderNeedsVerification: true } }, migrations: { academics: { completed: 2 } } });
    expect(db.getOperationsCommandCenter).toHaveBeenCalledWith(7);
  });

  it("rejects a teacher before reading the command-center aggregate", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 4, schoolId: 7, userId: 41, role: "teacher", status: "active", createdAt: new Date(), updatedAt: new Date() } as any);
    await expect(caller().nsos.operations.commandCenter({ schoolId: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getOperationsCommandCenter).not.toHaveBeenCalled();
  });
});
