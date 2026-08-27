import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/env", () => ({ ENV: { ownerOpenId: "platform-owner" } }));
vi.mock("./db", () => ({
  getInternalAffiliatePilotOverview: vi.fn(),
  confirmInternalAffiliatePilotDefaults: vi.fn(),
  hasActivePlatformOwnerIdentityLink: vi.fn(),
  canClaimVerifiedGooglePlatformOwnerLink: vi.fn(),
  claimVerifiedGooglePlatformOwnerLink: vi.fn(),
  revokePlatformOwnerIdentityLink: vi.fn(),
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
    vi.mocked(db.hasActivePlatformOwnerIdentityLink).mockResolvedValue(false);
    vi.mocked(db.canClaimVerifiedGooglePlatformOwnerLink).mockResolvedValue(false);
    await expect(callerFor("admin").nsos.platform.ownerAccess()).resolves.toEqual({ isPlatformOwner: true, canClaimOwnerAccess: false });
    await expect(callerFor("admin", "another-global-admin").nsos.platform.ownerAccess()).resolves.toEqual({ isPlatformOwner: false, canClaimOwnerAccess: false });
    await expect(callerFor("user", "regular-user").nsos.platform.ownerAccess()).resolves.toEqual({ isPlatformOwner: false, canClaimOwnerAccess: false });
  });

  it("allows only a verified eligible Google identity to explicitly claim a revocable owner link", async () => {
    vi.mocked(db.hasActivePlatformOwnerIdentityLink).mockResolvedValue(true);
    vi.mocked(db.canClaimVerifiedGooglePlatformOwnerLink).mockResolvedValue(true);
    vi.mocked(db.claimVerifiedGooglePlatformOwnerLink).mockResolvedValue(true);
    await expect(callerFor("user", "verified-google-owner").nsos.platform.claimOwnerAccess({ confirmed: true })).resolves.toEqual({ isPlatformOwner: true });
    expect(db.claimVerifiedGooglePlatformOwnerLink).toHaveBeenCalledWith({ userId: 8 });
    await expect(callerFor("user", "verified-google-owner").nsos.platform.claimOwnerAccess({ confirmed: false } as any)).rejects.toBeDefined();
  });

  it("allows a linked owner to revoke only their own recovered access", async () => {
    vi.mocked(db.hasActivePlatformOwnerIdentityLink).mockResolvedValue(true);
    vi.mocked(db.revokePlatformOwnerIdentityLink).mockResolvedValue(true);
    await expect(callerFor("user", "linked-google-owner").nsos.platform.revokeLinkedOwnerAccess({ confirmed: true })).resolves.toEqual({ revoked: true });
    expect(db.revokePlatformOwnerIdentityLink).toHaveBeenCalledWith(8);
  });

  it("requires explicit confirmation and records only server-owned approved defaults", async () => {
    vi.mocked(db.confirmInternalAffiliatePilotDefaults).mockResolvedValue({ defaultsRecorded: true } as any);
    const caller = callerFor("admin");
    await expect(caller.nsos.affiliatePilot.confirmInternalDefaults({ confirmed: false } as any)).rejects.toBeDefined();
    await expect(caller.nsos.affiliatePilot.confirmInternalDefaults({ confirmed: true })).resolves.toMatchObject({ defaultsRecorded: true });
    expect(db.confirmInternalAffiliatePilotDefaults).toHaveBeenCalledWith({ confirmedBy: 8 });
  });
});
