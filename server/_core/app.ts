import "dotenv/config";
import express from "express";
import { createServer } from "http";
import type { Server } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerEmailAuthRoutes, registerGoogleAuthRoutes } from "../auth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerSmsWebhookRoutes } from "../webhooks";
import { registerAffiliateRoutes } from "../affiliateRoutes";
import { createRateLimitMiddleware, requireSameOriginForMutations, securityHeadersMiddleware } from "../security";
import { requiredProductionEnvironmentErrors, requestObservabilityMiddleware } from "../observability";
import { ENV } from "./env";

export async function createApp(): Promise<{ app: express.Express; server: Server }> {
  const environmentErrors = requiredProductionEnvironmentErrors(ENV);
  if (environmentErrors.length) {
    throw new Error(`NSOS production startup configuration is invalid: ${environmentErrors.join(" ")}`);
  }

  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(requestObservabilityMiddleware());
  app.use(securityHeadersMiddleware(process.env.NODE_ENV === "production"));
  app.get("/healthz", (_request, response) => {
    response.set("Cache-Control", "no-store").status(200).json({ status: "ok" });
  });
  app.use("/api", (req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  app.use("/api", createRateLimitMiddleware({ namespace: "api", limit: 240, windowMs: 60_000 }));
  app.use("/api/trpc", requireSameOriginForMutations());
  app.use("/api/trpc", createRateLimitMiddleware({ namespace: "public-admissions", limit: 30, windowMs: 10 * 60_000, matcher: path => path.includes("nsos.admissions.publicSubmit") }));
  app.use("/api/trpc", createRateLimitMiddleware({ namespace: "lead-capture", limit: 8, windowMs: 15 * 60_000, matcher: path => path.includes("nsos.leads.capture") }));
  app.use("/api/trpc", createRateLimitMiddleware({ namespace: "lead-intent", limit: 5, windowMs: 15 * 60_000, matcher: path => path.includes("nsos.leads.highIntent") }));
  app.use("/api/trpc", createRateLimitMiddleware({ namespace: "biodata-document-extraction", limit: 8, windowMs: 10 * 60_000, matcher: path => path.includes("nsos.admissions.extractBiodata") }));
  app.use("/api/trpc", createRateLimitMiddleware({ namespace: "live-provider-action", limit: 6, windowMs: 10 * 60_000, matcher: path => path.includes("nsos.providers.sendTestSms") }));
  app.use("/api/trpc", createRateLimitMiddleware({ namespace: "family-receipt-scan", limit: 12, windowMs: 10 * 60_000, matcher: path => path.includes("nsos.portal.scanPaymentEvidence") }));
  app.use("/api/auth/email/request", requireSameOriginForMutations());
  app.use("/api/auth/email/request", createRateLimitMiddleware({ namespace: "passwordless-email", limit: 5, windowMs: 10 * 60_000 }));
  registerSmsWebhookRoutes(app);
  app.use(createRateLimitMiddleware({ namespace: "affiliate-redirects", limit: 30, windowMs: 10 * 60_000, matcher: path => path.startsWith("/r/") }));
  registerAffiliateRoutes(app);
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  registerStorageProxy(app);
  registerGoogleAuthRoutes(app);
  registerEmailAuthRoutes(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  return { app, server };
}
