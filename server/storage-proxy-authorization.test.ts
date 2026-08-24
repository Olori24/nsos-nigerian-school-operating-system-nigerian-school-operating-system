import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ getStoredObjectAccessRecord: vi.fn(), getSchoolMembership: vi.fn() }));
const sdk = vi.hoisted(() => ({ authenticateRequest: vi.fn() }));
vi.mock("../server/db", () => db);
vi.mock("../server/_core/sdk", () => ({ sdk }));
vi.mock("../server/_core/env", () => ({ ENV: { forgeApiUrl: "https://forge.example", forgeApiKey: "test-key" } }));

import { isSafeStorageKey, registerStorageProxy } from "./_core/storageProxy";

type Handler = (req: any, res: any) => Promise<void>;

function route() {
  let handler: Handler | undefined;
  registerStorageProxy({ get: (_path: string, registered: Handler) => { handler = registered; } } as any);
  return handler!;
}

function response() {
  return { code: 200, body: "", destination: "", status(code: number) { this.code = code; return this; }, send(body: string) { this.body = body; return this; }, set: vi.fn(), redirect(code: number, destination: string) { this.code = code; this.destination = destination; return this; } };
}

describe("storage proxy authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ url: "https://signed.example/object" }) }));
  });

  it("rejects unknown and traversal-style keys before signing or authentication", async () => {
    expect(isSafeStorageKey("schools/34/knowledge-library/../secret.txt")).toBe(false);
    const res = response();
    await route()({ params: { 0: "schools/34/knowledge-library/../secret.txt" } }, res);
    expect(res.code).toBe(404);
    expect(db.getStoredObjectAccessRecord).not.toHaveBeenCalled();
    expect(sdk.authenticateRequest).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("allows only selected published website media without a session", async () => {
    db.getStoredObjectAccessRecord.mockResolvedValue({ schoolId: 34, scope: "public_website_media" });
    const res = response();
    await route()({ params: { 0: "schools/34/website-media/logo/brand.png" } }, res);
    expect(res.code).toBe(307);
    expect(res.destination).toBe("https://signed.example/object");
    expect(sdk.authenticateRequest).not.toHaveBeenCalled();
  });

  it("blocks unauthenticated and cross-tenant private document downloads without revealing object existence", async () => {
    db.getStoredObjectAccessRecord.mockResolvedValue({ schoolId: 34, scope: "admission_document" });
    const req = { params: { 0: "schools/34/admissions/51/passport.png" } };
    sdk.authenticateRequest.mockRejectedValue(new Error("no session"));
    const anonymous = response();
    await route()(req, anonymous);
    expect(anonymous.code).toBe(404);
    expect(fetch).not.toHaveBeenCalled();

    sdk.authenticateRequest.mockResolvedValue({ id: 119 });
    db.getSchoolMembership.mockResolvedValue({ schoolId: 35, userId: 119, role: "owner", status: "active" });
    const crossTenant = response();
    await route()(req, crossTenant);
    expect(crossTenant.code).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("permits only active authorized members and a linked uploader for their own family payment evidence", async () => {
    db.getStoredObjectAccessRecord.mockResolvedValue({ schoolId: 34, scope: "payment_evidence", createdBy: 119 });
    sdk.authenticateRequest.mockResolvedValue({ id: 119 });
    db.getSchoolMembership.mockResolvedValue({ schoolId: 34, userId: 119, role: "parent", status: "active" });
    const ownEvidence = response();
    await route()({ params: { 0: "schools/34/cash-assurance/case-5/family-119-proof.png" } }, ownEvidence);
    expect(ownEvidence.code).toBe(307);

    db.getSchoolMembership.mockResolvedValue({ schoolId: 34, userId: 119, role: "parent", status: "inactive" });
    const revoked = response();
    await route()({ params: { 0: "schools/34/cash-assurance/case-5/family-119-proof.png" } }, revoked);
    expect(revoked.code).toBe(404);
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
    expect(owner.code).toBe(307);
  });
});
