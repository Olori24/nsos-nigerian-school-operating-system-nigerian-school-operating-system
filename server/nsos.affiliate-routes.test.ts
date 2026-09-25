import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  getAffiliateClickCookie: vi.fn(),
  getAffiliateClickById: vi.fn(),
  recordAffiliateLead: vi.fn(),
  sendNsosLeadEvent: vi.fn(),
  listAffiliatePartners: vi.fn(),
  createAffiliatePartner: vi.fn(),
  updateAffiliatePartner: vi.fn(),
  listAffiliateConversions: vi.fn(),
  recordAffiliateConversion: vi.fn(),
  approveAffiliateConversion: vi.fn(),
  listAffiliatePayouts: vi.fn(),
  createAffiliatePayout: vi.fn(),
  updateAffiliatePayoutStatus: vi.fn(),
}));

vi.mock("./db", () => db);
vi.mock("./resendLead", () => ({ sendNsosLeadEvent: db.sendNsosLeadEvent }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(cookie = ""): TrpcContext {
  return {
    user: { id: 71, openId: "affiliate-user", name: "Affiliate Owner", email: "owner@example.ng", loginMethod: "email", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), sessionId: "affiliate-session" },
    req: { protocol: "https", headers: { cookie } } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("NSOS affiliate attribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.sendNsosLeadEvent.mockResolvedValue({ accepted: true });
    db.getAffiliateClickCookie.mockReturnValue("click12345678901234");
    db.getAffiliateClickById.mockResolvedValue({ partner: { id: 9 }, click: { clickId: "click12345678901234" } });
    db.recordAffiliateLead.mockResolvedValue({ id: 22 });
  });

  it("attributes a consented lead to the active affiliate click cookie", async () => {
    await expect(appRouter.createCaller(context("nsos_affiliate_click=click12345678901234")).nsos.leads.capture({
      firstName: "Ada",
      email: "ada@example.ng",
      schoolName: "Example School",
      leadSource: "affiliate",
      consent: true,
    })).resolves.toEqual({ accepted: true });

    expect(db.recordAffiliateLead).toHaveBeenCalledWith(expect.objectContaining({
      partnerId: 9,
      clickId: "click12345678901234",
      email: "ada@example.ng",
      leadSource: "affiliate",
    }));
  });

  it("does not attribute when no active click can be resolved", async () => {
    db.getAffiliateClickCookie.mockReturnValue(null);

    await appRouter.createCaller(context()).nsos.leads.capture({
      firstName: "Ada",
      email: "ada@example.ng",
      leadSource: "direct",
      consent: true,
    });

    expect(db.recordAffiliateLead).not.toHaveBeenCalled();
  });

  it("rejects a lead without explicit consent", async () => {
    await expect(appRouter.createCaller(context()).nsos.leads.capture({
      firstName: "Ada",
      email: "ada@example.ng",
      leadSource: "affiliate",
      consent: false as never,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
