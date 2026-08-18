import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getSchoolMembership: vi.fn(),
  listProviderConfigurations: vi.fn(),
  saveProviderConfiguration: vi.fn(),
  providerRequiresCredentials: vi.fn((provider: string) => provider !== "manual" && provider !== "in_app"),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function caller() {
  return appRouter.createCaller({ user: { id: 8, openId: "provider-admin", name: "Provider Admin", email: "admin@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

describe("NSOS provider configuration routes", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 1, schoolId: 1, userId: 8, role: "admin", status: "active", createdAt: new Date(), updatedAt: new Date() }); });

  it("allows an administrator to read sanitized tenant provider configuration", async () => {
    vi.mocked(db.listProviderConfigurations).mockResolvedValue([{ category: "payment", provider: "paystack", hasCredentials: true, readiness: "Ready for payment adapter" }] as any);
    await expect(caller().nsos.providers.list({ schoolId: 1 })).resolves.toHaveLength(1);
    expect(db.listProviderConfigurations).toHaveBeenCalledWith(1);
  });

  it("passes provider credentials only into the server-side save service", async () => {
    vi.mocked(db.saveProviderConfiguration).mockResolvedValue([] as any);
    await caller().nsos.providers.save({ schoolId: 1, category: "payment", provider: "paystack", status: "ready", configuration: { publicKey: "pk_test" }, credentials: { secretKey: "sk_test" } });
    expect(db.saveProviderConfiguration).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 1, category: "payment", configuredBy: 8, credentials: { secretKey: "sk_test" } }));
  });

  it("rejects provider configuration changes from non-management roles", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 2, schoolId: 1, userId: 8, role: "teacher", status: "active", createdAt: new Date(), updatedAt: new Date() });
    await expect(caller().nsos.providers.list({ schoolId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.listProviderConfigurations).not.toHaveBeenCalled();
  });
});
