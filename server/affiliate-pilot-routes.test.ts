import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/env", () => ({ ENV: { ownerOpenId: "platform-owner" } }));
vi.mock("./db", () => ({
  getInternalAffiliatePilotOverview: vi.fn(),
  confirmInternalAffiliatePilotDefaults: vi.fn(),
  getSchoolMembership: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const callerFor = (role: "admin" | "user", openId = "platform-owner") => appRouter.createCaller({
  user: { id: 8, openId, name: "NSOS Operator", email: "operator@example.com", loginMethod: "email", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("NSOS internal affiliate pilot routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("limits the pilot configuration to the configured platform owner", async () => {
    vi.mocked(db.getInternalAffiliatePilotOverview).mockResolvedValue({ defaultsRecorded: false } as any);
    await expect(callerFor("admin", "another-global-admin").nsos.affiliatePilot.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(callerFor("user", "regular-user").nsos.affiliatePilot.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(callerFor("admin").nsos.affiliatePilot.overview()).resolves.toMatchObject({ defaultsRecorded: false });
  });

  it("reports platform-control visibility only to the current user without treating a global admin as the platform owner", async () => {
    await expect(callerFor("admin").nsos.platform.ownerAccess()).resolves.toEqual({ isPlatformOwner: true });
    await expect(callerFor("admin", "another-global-admin").nsos.platform.ownerAccess()).resolves.toEqual({ isPlatformOwner: false });
    await expect(callerFor("user", "regular-user").nsos.platform.ownerAccess()).resolves.toEqual({ isPlatformOwner: false });
  });

  it("requires explicit confirmation and records only server-owned approved defaults", async () => {
    vi.mocked(db.confirmInternalAffiliatePilotDefaults).mockResolvedValue({ defaultsRecorded: true } as any);
    const caller = callerFor("admin");
    await expect(caller.nsos.affiliatePilot.confirmInternalDefaults({ confirmed: false } as any)).rejects.toBeDefined();
    await expect(caller.nsos.affiliatePilot.confirmInternalDefaults({ confirmed: true })).resolves.toMatchObject({ defaultsRecorded: true });
    expect(db.confirmInternalAffiliatePilotDefaults).toHaveBeenCalledWith({ confirmedBy: 8 });
  });
});
