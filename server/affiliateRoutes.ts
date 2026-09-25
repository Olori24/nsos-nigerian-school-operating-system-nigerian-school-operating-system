import type { Express, Request } from "express";
import { randomUUID } from "node:crypto";
import * as db from "./db";

function clientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return value?.trim() || req.socket.remoteAddress || undefined;
}

export function registerAffiliateRoutes(app: Express) {
  app.get("/r/:code", async (req, res) => {
    try {
      const partner = await db.getAffiliatePartnerByCode(req.params.code);
      if (!partner) {
        res.status(404).type("text").send("Affiliate link not found.");
        return;
      }

      const clickId = randomUUID().replace(/-/g, "");
      const result = await db.recordAffiliateClick({
        partnerId: partner.id,
        clickId,
        ip: clientIp(req),
        userAgent: req.get("user-agent"),
        referrer: req.get("referer"),
        landingPath: req.originalUrl,
        utmSource: typeof req.query.utm_source === "string" ? req.query.utm_source : undefined,
        utmMedium: typeof req.query.utm_medium === "string" ? req.query.utm_medium : undefined,
        utmCampaign: typeof req.query.utm_campaign === "string" ? req.query.utm_campaign : undefined,
        utmContent: typeof req.query.utm_content === "string" ? req.query.utm_content : undefined,
        utmTerm: typeof req.query.utm_term === "string" ? req.query.utm_term : undefined,
      });

      res.cookie("nsos_affiliate_click", result.clickId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: result.attributionDays * 24 * 60 * 60 * 1000,
        path: "/",
      });
      res.redirect(302, result.destinationUrl);
    } catch (error) {
      console.error("Affiliate redirect failed", error);
      res.status(500).type("text").send("Affiliate link is temporarily unavailable.");
    }
  });
}
