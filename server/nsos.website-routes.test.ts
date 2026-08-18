import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getSchoolMembership: vi.fn(),
  saveSchoolWebsite: vi.fn(),
  verifySchoolWebsiteDomain: vi.fn(),
  getPublicSchoolWebsite: vi.fn(),
  getPublicSchoolWebsiteByDomain: vi.fn(),
  recordSecurityAuditEvent: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const adminCaller = () => appRouter.createCaller({ user: { id: 5, openId: "admin-5", name: "School Admin", email: "admin@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("NSOS tenant website routes", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 1, schoolId: 1, userId: 5, role: "admin", status: "active", createdAt: new Date(), updatedAt: new Date() }); });

  it("allows an administrator to save tenant website settings", async () => {
    vi.mocked(db.saveSchoolWebsite).mockResolvedValue({ school: { id: 1, name: "Greener Future Academy" }, website: { published: true } } as any);
    await expect(adminCaller().nsos.website.save({ schoolId: 1, headline: "Future-ready learning.", primaryColor: "#0f5c4f", admissionsEnabled: true, published: true })).resolves.toMatchObject({ website: { published: true } });
    expect(db.saveSchoolWebsite).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 1, headline: "Future-ready learning.", published: true }));
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 1, actorUserId: 5, eventType: "school_website_configuration_saved" }));
  });

  it("resolves only the public school-site configuration for an external visitor", async () => {
    vi.mocked(db.getPublicSchoolWebsite).mockResolvedValue({ school: { id: 1, name: "Greener Future Academy", shortCode: "GFA-001" }, website: { published: true }, admissionsUrl: "/apply/GFA-001" } as any);
    const anonymous = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(anonymous.nsos.website.publicSite({ shortCode: "GFA-001" })).resolves.toMatchObject({ admissionsUrl: "/apply/GFA-001" });
    expect(db.getPublicSchoolWebsite).toHaveBeenCalledWith("GFA-001");
  });

  it("verifies a pending school domain through an authorized administrator", async () => {
    vi.mocked(db.verifySchoolWebsiteDomain).mockResolvedValue({ website: { customDomain: "www.greenerfuture.edu.ng", domainStatus: "active" } } as any);
    await expect(adminCaller().nsos.website.verifyDomain({ schoolId: 1 })).resolves.toMatchObject({ website: { domainStatus: "active" } });
    expect(db.verifySchoolWebsiteDomain).toHaveBeenCalledWith(1);
  });

  it("rejects public website configuration attempts from non-administrator school roles", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 2, schoolId: 1, userId: 5, role: "teacher", status: "active", createdAt: new Date(), updatedAt: new Date() });
    await expect(adminCaller().nsos.website.save({ schoolId: 1, headline: "Unauthorised change" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.saveSchoolWebsite).not.toHaveBeenCalled();
  });

  it("resolves a published school only when its active custom domain is requested", async () => {
    vi.mocked(db.getPublicSchoolWebsiteByDomain).mockResolvedValue({ school: { name: "Greener Future Academy" }, website: { domainStatus: "active", published: true }, admissionsUrl: "/apply/GFA-001" } as any);
    const anonymous = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(anonymous.nsos.website.publicDomain({ domain: "www.greenerfuture.edu.ng" })).resolves.toMatchObject({ admissionsUrl: "/apply/GFA-001" });
    expect(db.getPublicSchoolWebsiteByDomain).toHaveBeenCalledWith("www.greenerfuture.edu.ng");
  });
});
