import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerEmailAuthRoutes, registerGoogleAuthRoutes } from "../auth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./vite";
import { registerSmsWebhookRoutes } from "../webhooks";
import { registerAffiliateRoutes } from "../affiliateRoutes";
import { createRateLimitMiddleware, requireSameOriginForMutations, securityHeadersMiddleware } from "../security";
import { requiredProductionEnvironmentErrors, requestObservabilityMiddleware } from "../observability";
import { ENV } from "./env";
import path from "node:path";

export function createApplication(options: { serveStatic?: boolean; spaFallback?: boolean } = {}) {
  const environmentErrors = requiredProductionEnvironmentErrors(ENV);
  if (environmentErrors.length) {
    throw new Error(`NSOS production startup configuration is invalid: ${environmentErrors.join(" ")}`);
  }

  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(requestObservabilityMiddleware());
  app.use(securityHeadersMiddleware(process.env.NODE_ENV === "production"));

  app.get("/healthz", (_request, response) => {
    response.set("Cache-Control", "no-store").status(200).json({ status: "ok" });
  });

  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
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

  // Provider callbacks are registered before general parsers so Termii receives
  // the original bytes required for signature verification.
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
    }),
  );

  if (options.serveStatic) {
    serveStatic(app);
  } else if (options.spaFallback) {
    app.use("*", (req, res) => {
      const pathName = req.path;
      const isServerRoute =
        pathName === "/healthz" ||
        pathName === "/api" ||
        pathName.startsWith("/api/") ||
        pathName === "/r" ||
        pathName.startsWith("/r/") ||
        pathName === "/manus-storage" ||
        pathName.startsWith("/manus-storage/");

      if (isServerRoute) {
        return res.status(404).json({ error: "Route not found." });
      }

      res.set("Cache-Control", "no-cache").sendFile(path.resolve(process.cwd(), "dist/public/index.html"));
    });
  }

  return app;
}
