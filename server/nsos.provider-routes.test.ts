import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getSchoolMembership: vi.fn(),
  listProviderConfigurations: vi.fn(),
  saveProviderConfiguration: vi.fn(),
  testProviderConnection: vi.fn(),
  getSmsDeliveryWebhookUrls: vi.fn(),
  listSecurityAuditEvents: vi.fn(),
  recordSecurityAuditEvent: vi.fn(),
  sendProviderSmsTest: vi.fn(),
  checkProviderSmsTestDelivery: vi.fn(),
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
    vi.mocked(db.listProviderConfigurations).mockResolvedValue([{ channel: "payment", provider: "paystack", hasCredentials: true, readiness: "Ready for payment adapter" }, { channel: "sms", provider: "termii", hasCredentials: true, readiness: "Ready for SMS adapter" }, { channel: "email", provider: "resend", hasCredentials: false, readiness: "Credentials required" }] as any);
    await expect(caller().nsos.providers.list({ schoolId: 1 })).resolves.toHaveLength(3);
    expect(db.listProviderConfigurations).toHaveBeenCalledWith(1);
  });

  it("passes provider credentials only into the server-side save service", async () => {
    vi.mocked(db.saveProviderConfiguration).mockResolvedValue([] as any);
    await caller().nsos.providers.save({ schoolId: 1, channel: "payment", provider: "paystack", status: "ready", configuration: { publicKey: "pk_test" }, credentials: { secretKey: "sk_test" } });
    expect(db.saveProviderConfiguration).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 1, channel: "payment", configuredBy: 8, credentials: { secretKey: "sk_test" } }));
  });

  it("allows independently scoped SMS, WhatsApp, and email configuration without replacing another channel", async () => {
    vi.mocked(db.saveProviderConfiguration).mockResolvedValue([] as any);
    await caller().nsos.providers.save({ schoolId: 1, channel: "sms", provider: "termii", status: "draft", configuration: { senderId: "GFA" } });
    await caller().nsos.providers.save({ schoolId: 1, channel: "whatsapp", provider: "whatsapp_cloud", status: "draft", configuration: { senderId: "+2348000000000" } });
    await caller().nsos.providers.save({ schoolId: 1, channel: "email", provider: "resend", status: "draft", configuration: { senderId: "notifications@nsos.ng" } });
    expect(db.saveProviderConfiguration).toHaveBeenNthCalledWith(1, expect.objectContaining({ channel: "sms", provider: "termii", configuredBy: 8 }));
    expect(db.saveProviderConfiguration).toHaveBeenNthCalledWith(2, expect.objectContaining({ channel: "whatsapp", provider: "whatsapp_cloud", configuredBy: 8 }));
    expect(db.saveProviderConfiguration).toHaveBeenNthCalledWith(3, expect.objectContaining({ channel: "email", provider: "resend", configuredBy: 8 }));
  });

  it("rejects provider configuration changes from non-management roles", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 2, schoolId: 1, userId: 8, role: "teacher", status: "active", createdAt: new Date(), updatedAt: new Date() });
    await expect(caller().nsos.providers.list({ schoolId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.listProviderConfigurations).not.toHaveBeenCalled();
  });

  it("allows an administrator to initiate a server-side provider connection test", async () => {
    vi.mocked(db.testProviderConnection).mockResolvedValue({ ok: true, message: "Connection verified. No payment or notification was sent.", testedAt: new Date() });
    await expect(caller().nsos.providers.testConnection({ schoolId: 1, channel: "payment" })).resolves.toMatchObject({ ok: true });
    expect(db.testProviderConnection).toHaveBeenCalledWith(1, "payment");
  });

  it("returns tenant-scoped callback URLs only to school administrators", async () => {
    vi.mocked(db.getSmsDeliveryWebhookUrls).mockReturnValue({ termii: "https://nsos-system-uhkdscaf.manus.space/api/webhooks/sms/termii?schoolId=1", twilio: "https://nsos-system-uhkdscaf.manus.space/api/webhooks/sms/twilio?schoolId=1" });
    await expect(caller().nsos.providers.webhookUrls({ schoolId: 1 })).resolves.toMatchObject({ termii: expect.stringContaining("schoolId=1") });
    expect(db.getSmsDeliveryWebhookUrls).toHaveBeenCalledWith(1);
  });

  it("allows school administrators to read their tenant-scoped security audit trail", async () => {
    vi.mocked(db.listSecurityAuditEvents).mockResolvedValue([{ id: 5, eventType: "provider_configuration_saved", targetType: "provider_configuration", metadata: { provider: "termii" }, occurredAt: new Date() }] as any);
    await expect(caller().nsos.security.auditEvents({ schoolId: 1, limit: 20 })).resolves.toHaveLength(1);
    expect(db.listSecurityAuditEvents).toHaveBeenCalledWith(1, 20);
  });

  it("requires explicit confirmation before an administrator can dispatch a real SMS test", async () => {
    vi.mocked(db.sendProviderSmsTest).mockResolvedValue({ ok: true, message: "Test SMS accepted for delivery to 2348••••123.", recipient: "2348••••123" });
    await expect(caller().nsos.providers.sendTestSms({ schoolId: 1, to: "08031234567", confirmed: true })).resolves.toMatchObject({ ok: true });
    expect(db.sendProviderSmsTest).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 1, to: "08031234567", confirmed: true, createdBy: 8 }));
  });

  it("allows an administrator to check a submitted SMS test for provider-confirmed delivery", async () => {
    vi.mocked(db.checkProviderSmsTestDelivery).mockResolvedValue({ ok: true, deliveryState: "delivered", message: "Provider confirmed that the test SMS was delivered." });
    await expect(caller().nsos.providers.checkTestSmsDelivery({ schoolId: 1, messageLogId: 42 })).resolves.toMatchObject({ deliveryState: "delivered" });
    expect(db.checkProviderSmsTestDelivery).toHaveBeenCalledWith({ schoolId: 1, messageLogId: 42 });
  });
});
