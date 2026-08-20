import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getSchoolMembership: vi.fn(),
  getAdvertisingWorkspace: vi.fn(),
  saveMetaAdvertisingAccount: vi.fn(),
  testMetaAdvertisingAccount: vi.fn(),
  createAdvertisingCampaign: vi.fn(),
  requestAdvertisingCampaignApproval: vi.fn(),
  approveAdvertisingCampaign: vi.fn(),
  preparePausedMetaCampaign: vi.fn(),
  preparePausedMetaDelivery: vi.fn(),
  setMetaAdvertisingAdStatus: vi.fn(),
  syncMetaAdvertisingCampaign: vi.fn(),
  consumeSharedRateLimit: vi.fn(),
  recordSecurityAuditEvent: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function caller() {
  return appRouter.createCaller({ user: { id: 15, openId: "advertising-admin", name: "Advertising Admin", email: "admin@example.com", loginMethod: "email", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

const campaignInput = { schoolId: 4, name: "Admissions campaign", objective: "lead_generation" as const, destinationUrl: "https://school.example/apply", primaryText: "Admissions are now open for the new school year.", headline: "Apply to our school", callToAction: "apply_now" as const, audienceSummary: { locations: ["Abeokuta", "Ogun"], ageMin: 25, ageMax: 55 }, dailyBudget: 10000, totalBudget: 100000 };

describe("NSOS advertising routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 1, schoolId: 4, userId: 15, role: "admin", status: "active", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(db.consumeSharedRateLimit).mockResolvedValue({ allowed: true, retryAfterSeconds: 1 });
    vi.mocked(db.recordSecurityAuditEvent).mockResolvedValue(undefined);
  });

  it("returns only the current school’s advertising workspace to a school administrator", async () => {
    vi.mocked(db.getAdvertisingWorkspace).mockResolvedValue({ account: { status: "not_connected" }, campaigns: [], summary: { draft: 0, awaitingApproval: 0, approved: 0, live: 0 } } as any);
    await expect(caller().nsos.advertising.workspace({ schoolId: 4 })).resolves.toMatchObject({ summary: { draft: 0 } });
    expect(db.getAdvertisingWorkspace).toHaveBeenCalledWith(4);
  });

  it("sends a Meta token only to the server-side encrypted-account service and records no token in the audit call", async () => {
    vi.mocked(db.saveMetaAdvertisingAccount).mockResolvedValue({ id: 9, status: "connected" } as any);
    await caller().nsos.advertising.saveMetaAccount({ schoolId: 4, accountName: "School admissions", externalAccountId: "act_123456789", accessToken: "meta_access_token_that_is_long_enough" });
    expect(db.saveMetaAdvertisingAccount).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 4, connectedBy: 15, accessToken: "meta_access_token_that_is_long_enough" }));
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "advertising_meta_account_saved", metadata: expect.not.objectContaining({ accessToken: expect.anything() }) }));
  });

  it("rejects advertising access from a non-management school role", async () => {
    vi.mocked(db.getSchoolMembership).mockResolvedValue({ id: 2, schoolId: 4, userId: 15, role: "teacher", status: "active", createdAt: new Date(), updatedAt: new Date() });
    await expect(caller().nsos.advertising.workspace({ schoolId: 4 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getAdvertisingWorkspace).not.toHaveBeenCalled();
  });

  it("creates a rate-limited private campaign draft with the acting administrator recorded", async () => {
    vi.mocked(db.createAdvertisingCampaign).mockResolvedValue({ campaignId: 22, accountConnected: false });
    await expect(caller().nsos.advertising.createCampaign(campaignInput)).resolves.toMatchObject({ campaignId: 22 });
    expect(db.consumeSharedRateLimit).toHaveBeenCalledWith(expect.objectContaining({ namespace: "advertising", route: "campaign-create", clientKey: "4:15" }));
    expect(db.createAdvertisingCampaign).toHaveBeenCalledWith(expect.objectContaining({ ...campaignInput, createdBy: 15 }));
  });

  it("requires explicit confirmation before recording an advertising spend approval", async () => {
    vi.mocked(db.approveAdvertisingCampaign).mockResolvedValue({ campaignId: 22, status: "approved" });
    await expect(caller().nsos.advertising.approveCampaign({ schoolId: 4, campaignId: 22, confirmed: true })).resolves.toMatchObject({ status: "approved" });
    expect(db.approveAdvertisingCampaign).toHaveBeenCalledWith({ schoolId: 4, campaignId: 22, approvedBy: 15 });
    await expect(caller().nsos.advertising.approveCampaign({ schoolId: 4, campaignId: 22, confirmed: false as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires a second explicit confirmation before it can prepare a paused Meta campaign", async () => {
    vi.mocked(db.preparePausedMetaCampaign).mockResolvedValue({ campaignId: 22, providerCampaignId: "meta-campaign-22", status: "paused", message: "Meta campaign created in a paused state." });
    await expect(caller().nsos.advertising.preparePausedMetaCampaign({ schoolId: 4, campaignId: 22, confirmed: true })).resolves.toMatchObject({ status: "paused" });
    expect(db.preparePausedMetaCampaign).toHaveBeenCalledWith({ schoolId: 4, campaignId: 22, launchedBy: 15 });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "advertising_meta_campaign_prepared_paused", metadata: expect.objectContaining({ activeAdvertCreated: false }) }));
    await expect(caller().nsos.advertising.preparePausedMetaCampaign({ schoolId: 4, campaignId: 22, confirmed: false as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("records paused delivery preparation separately from active-ad activation", async () => {
    vi.mocked(db.preparePausedMetaDelivery).mockResolvedValue({ campaignId: 22, providerAdId: "meta-ad-22", status: "paused", message: "Paused Meta delivery assets are ready." });
    await expect(caller().nsos.advertising.preparePausedMetaDelivery({ schoolId: 4, campaignId: 22, confirmed: true })).resolves.toMatchObject({ status: "paused" });
    expect(db.preparePausedMetaDelivery).toHaveBeenCalledWith({ schoolId: 4, campaignId: 22, preparedBy: 15 });
    expect(db.recordSecurityAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "advertising_meta_delivery_prepared_paused", metadata: expect.objectContaining({ activeAdvertCreated: false }) }));
  });

  it("requires confirmation before activating or pausing a spend-bearing Meta advert", async () => {
    vi.mocked(db.setMetaAdvertisingAdStatus).mockResolvedValue({ campaignId: 22, status: "active", message: "Meta advert activated." });
    await expect(caller().nsos.advertising.activateMetaAd({ schoolId: 4, campaignId: 22, confirmed: true })).resolves.toMatchObject({ status: "active" });
    expect(db.setMetaAdvertisingAdStatus).toHaveBeenCalledWith({ schoolId: 4, campaignId: 22, status: "ACTIVE", changedBy: 15 });
    await expect(caller().nsos.advertising.activateMetaAd({ schoolId: 4, campaignId: 22, confirmed: false as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    vi.mocked(db.setMetaAdvertisingAdStatus).mockResolvedValue({ campaignId: 22, status: "paused", message: "Meta advert paused." });
    await expect(caller().nsos.advertising.pauseMetaAd({ schoolId: 4, campaignId: 22, confirmed: true })).resolves.toMatchObject({ status: "paused" });
    expect(db.setMetaAdvertisingAdStatus).toHaveBeenLastCalledWith({ schoolId: 4, campaignId: 22, status: "PAUSED", changedBy: 15 });
  });

  it("keeps external Meta status synchronization tenant-scoped and non-spending", async () => {
    vi.mocked(db.syncMetaAdvertisingCampaign).mockResolvedValue({ campaignId: 22, status: "active", providerStatus: "ACTIVE", syncedAt: new Date() });
    await expect(caller().nsos.advertising.syncMetaCampaign({ schoolId: 4, campaignId: 22 })).resolves.toMatchObject({ providerStatus: "ACTIVE" });
    expect(db.syncMetaAdvertisingCampaign).toHaveBeenCalledWith({ schoolId: 4, campaignId: 22 });
  });
});
