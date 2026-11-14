import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ getStoredObjectAccessRecord: vi.fn(), getSchoolMembership: vi.fn() }));
const sdk = vi.hoisted(() => ({ authenticateRequest: vi.fn() }));
const storage = vi.hoisted(() => ({ storageGetObject: vi.fn() }));
vi.mock("../server/db", () => db);
vi.mock("../server/_core/sdk", () => ({ sdk }));
vi.mock("../server/storage", () => storage);

import { isSafeStorageKey, registerStorageProxy } from "./_core/storageProxy";

type Handler = (req: any, res: any) => Promise<void>;

function route() {
  let handler: Handler | undefined;
  registerStorageProxy({ get: (_path: string, registered: Handler) => { handler = registered; } } as any);
  return handler!;
}

function response() {
  return { code: 200, body: "", destination: "", headers: {} as Record<string, string>, status(code: number) { this.code = code; return this; }, send(body: string) { this.body = body; return this; }, set(name: string, value: string) { this.headers[name] = value; return this; }, redirect(code: number, destination: string) { this.code = code; this.destination = destination; return this; } };
}

describe("storage proxy authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.storageGetObject.mockResolvedValue({ Body: { pipe: vi.fn(), on: vi.fn() }, ContentType: "application/octet-stream", ContentLength: 1 });
  });

  it("rejects unknown and traversal-style keys before signing or authentication", async () => {
    expect(isSafeStorageKey("schools/34/knowledge-library/../secret.txt")).toBe(false);
    const res = response();
    await route()({ params: { 0: "schools/34/knowledge-library/../secret.txt" } }, res);
    expect(res.code).toBe(404);
    expect(db.getStoredObjectAccessRecord).not.toHaveBeenCalled();
    expect(sdk.authenticateRequest).not.toHaveBeenCalled();

  });

  it("allows only selected published website media without a session", async () => {
    db.getStoredObjectAccessRecord.mockResolvedValue({ schoolId: 34, scope: "public_website_media" });
    const res = response();
    await route()({ params: { 0: "schools/34/website-media/logo/brand.png" } }, res);
    expect(res.code).toBe(200);
    expect(sdk.authenticateRequest).not.toHaveBeenCalled();
  });

  it("blocks unauthenticated and cross-tenant private document downloads without revealing object existence", async () => {
    db.getStoredObjectAccessRecord.mockResolvedValue({ schoolId: 34, scope: "admission_document" });
    const req = { params: { 0: "schools/34/admissions/51/passport.png" } };
    sdk.authenticateRequest.mockRejectedValue(new Error("no session"));
    const anonymous = response();
    await route()(req, anonymous);
    expect(anonymous.code).toBe(404);

    sdk.authenticateRequest.mockResolvedValue({ id: 119 });
    db.getSchoolMembership.mockResolvedValue({ schoolId: 35, userId: 119, role: "owner", status: "active" });
    const crossTenant = response();
    await route()(req, crossTenant);
    expect(crossTenant.code).toBe(404);
  });

  it("permits only active authorized members and a linked uploader for their own family payment evidence", async () => {
    db.getStoredObjectAccessRecord.mockResolvedValue({ schoolId: 34, scope: "payment_evidence", createdBy: 119 });
    sdk.authenticateRequest.mockResolvedValue({ id: 119 });
    db.getSchoolMembership.mockResolvedValue({ schoolId: 34, userId: 119, role: "parent", status: "active" });
    const ownEvidence = response();
    await route()({ params: { 0: "schools/34/cash-assurance/case-5/family-119-proof.png" } }, ownEvidence);
    expect(ownEvidence.code).toBe(200);

    db.getSchoolMembership.mockResolvedValue({ schoolId: 34, userId: 119, role: "parent", status: "inactive" });
    const revoked = response();
    await route()({ params: { 0: "schools/34/cash-assurance/case-5/family-119-proof.png" } }, revoked);
    expect(revoked.code).toBe(404);
  });

  it("forces active content to download and applies browser isolation headers", async () => {
    db.getStoredObjectAccessRecord.mockResolvedValue({ schoolId: 34, scope: "public_website_media" });
    storage.storageGetObject.mockResolvedValue({ Body: { pipe: vi.fn(), on: vi.fn() }, ContentType: "text/html; charset=utf-8", ContentLength: 20 });
    const res = response();
    await route()({ params: { 0: "schools/34/website-media/page.html" } }, res);
    expect(res.headers["Content-Type"]).toBe("application/octet-stream");
    expect(res.headers["Content-Disposition"]).toBe("attachment");
    expect(res.headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(res.headers["Content-Security-Policy"]).toContain("sandbox");
  });

  it("allows only safe raster images to render inline", async () => {
    db.getStoredObjectAccessRecord.mockResolvedValue({ schoolId: 34, scope: "public_website_media" });
    storage.storageGetObject.mockResolvedValue({ Body: { pipe: vi.fn(), on: vi.fn() }, ContentType: "image/png", ContentLength: 20 });
    const res = response();
    await route()({ params: { 0: "schools/34/website-media/logo.png" } }, res);
    expect(res.headers["Content-Type"]).toBe("image/png");
    expect(res.headers["Content-Disposition"]).toBeUndefined();
    expect(res.headers["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("keeps File-to-School source artifacts restricted to active owners and administrators", async () => {
    db.getStoredObjectAccessRecord.mockResolvedValue({ schoolId: 34, scope: "knowledge_source" });
    sdk.authenticateRequest.mockResolvedValue({ id: 119 });
    db.getSchoolMembership.mockResolvedValue({ schoolId: 34, userId: 119, role: "teacher", status: "active" });
    const teacher = response();
    await route()({ params: { 0: "schools/34/knowledge-library/source/curriculum.md" } }, teacher);
    expect(teacher.code).toBe(404);

    db.getSchoolMembership.mockResolvedValue({ schoolId: 34, userId: 119, role: "owner", status: "active" });
    const owner = response();
    await route()({ params: { 0: "schools/34/knowledge-library/source/curriculum.md" } }, owner);
    expect(owner.code).toBe(200);
  });
});
