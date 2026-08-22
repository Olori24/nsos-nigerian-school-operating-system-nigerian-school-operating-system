import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getSchoolMembership: vi.fn(),
  getSchoolWebsite: vi.fn(),
  listSchoolWebsiteMedia: vi.fn(),
  uploadSchoolWebsiteMedia: vi.fn(),
  saveSchoolWebsite: vi.fn(),
  verifySchoolWebsiteDomain: vi.fn(),
  getPublicSchoolWebsite: vi.fn(),
  getPublicSchoolWebsiteByDomain: vi.fn(),
  consumeSharedRateLimit: vi.fn(),
  recordSecurityAuditEvent: vi.fn(),
}));
vi.mock("./aiWebsiteAgent", () => ({ generateAiWebsiteDraft: vi.fn() }));

import * as db from "./db";
import { generateAiWebsiteDraft } from "./aiWebsiteAgent";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const adminCaller = () => appRouter.createCaller({ user: { id: 5, openId: "admin-5", name: "School Admin", email: "admin@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("NSOS tenant website routes", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 1, schoolId: 1, userId: 5, role: "admin", status: "active", createdAt: new Date(), updatedAt: new Date() }); vi.mocked(db.consumeSharedRateLimit).mockResolvedValue({ allowed: true, retryAfterSeconds: 0 } as any); });

  it("allows an administrator to save tenant website settings", async () => {
    vi.mocked(db.saveSchoolWebsite).mockResolvedValue({ school: { id: 1, name: "Greener Future Academy" }, website: { published: true } } as any);
    await expect(adminCaller().nsos.website.save({ schoolId: 1, headline: "Future-ready learning.", primaryColor: "#0f5c4f", admissionsEnabled: true, published: true })).resolves.toMatchObject({ website: { published: true } });
    expect(db.saveSchoolWebsite).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 1, headline: "Future-ready learning.", published: true }));
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 1, actorUserId: 5, eventType: "school_website_configuration_saved" }));
  });

  it("allows an administrator to list and upload only approved school-owned website media", async () => {
    vi.mocked(db.listSchoolWebsiteMedia).mockResolvedValue([{ id: 9, purpose: "logo", label: "School mark", url: "/manus-storage/school-mark.png" }] as any);
    vi.mocked(db.uploadSchoolWebsiteMedia).mockResolvedValue({ id: 9, purpose: "logo", label: "School mark", mimeType: "image/png", byteSize: 1024 } as any);
    await expect(adminCaller().nsos.website.media({ schoolId: 1 })).resolves.toHaveLength(1);
    await expect(adminCaller().nsos.website.uploadMedia({ schoolId: 1, purpose: "logo", label: "School mark", fileName: "school-mark.png", mimeType: "image/png", base64: "a".repeat(100) })).resolves.toMatchObject({ id: 9, purpose: "logo" });
    expect(db.uploadSchoolWebsiteMedia).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 1, uploadedBy: 5, purpose: "logo" }));
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "school_website_media_uploaded", targetType: "school_website_media", targetId: 9, metadata: expect.objectContaining({ purpose: "logo" }) }));
  });

  it("applies a confirmed website-agent proposal only as an unpublished draft and records the approval trail", async () => {
    vi.mocked(db.saveSchoolWebsite).mockResolvedValue({ school: { id: 1, name: "Greener Future Academy" }, website: { published: false, headline: "Learning with confidence" } } as any);
    await expect(adminCaller().nsos.website.applySetupAgentDraft({ schoolId: 1, headline: "Learning with confidence", introduction: "A reviewed introduction for the school community and prospective families.", primaryColor: "#0f5c4f", contactEmail: "admissions@example.ng", admissionsEnabled: true, logoMediaId: 9, heroMediaId: 10, confirmed: true })).resolves.toMatchObject({ website: { published: false } });
    expect(db.saveSchoolWebsite).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 1, headline: "Learning with confidence", logoMediaId: 9, heroMediaId: 10, published: false, admissionsEnabled: true }));
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 1, actorUserId: 5, eventType: "website_setup_agent_draft_applied", metadata: expect.objectContaining({ appliedAsDraft: true }) }));
  });

  it("generates an owner-reviewable AI website draft without saving, publishing, or connecting a domain", async () => {
    vi.mocked(db.getSchoolWebsite).mockResolvedValue({ school: { id: 1, name: "Greener Future Academy", state: "Ogun" }, website: { headline: "", introduction: "", published: false } } as any);
    vi.mocked(generateAiWebsiteDraft).mockResolvedValue({ headline: "Learning with purpose", introduction: "Review the school’s approved admissions and contact information.", reviewNote: "Confirm every statement.", source: "ai", requiresConfirmation: true });
    await expect(adminCaller().nsos.website.generateAgentDraft({ schoolId: 1, brief: "Write a welcoming website introduction for families." })).resolves.toMatchObject({ source: "ai", requiresConfirmation: true });
    expect(db.saveSchoolWebsite).not.toHaveBeenCalled();
    expect(db.verifySchoolWebsiteDomain).not.toHaveBeenCalled();
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "website_ai_draft_generated", metadata: expect.objectContaining({ generatedAsDraft: true, requiresConfirmation: true }) }));
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 2, schoolId: 1, userId: 5, role: "teacher", status: "active", createdAt: new Date(), updatedAt: new Date() });
    await expect(adminCaller().nsos.website.generateAgentDraft({ schoolId: 1, brief: "Write a welcoming website introduction for families." })).rejects.toMatchObject({ code: "FORBIDDEN" });
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
