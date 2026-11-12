import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { pathToFileURL } from "node:url";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth.js";
import { registerEmailAuthRoutes, registerGoogleAuthRoutes } from "../auth.js";
import { registerStorageProxy } from "./storageProxy.js";
import { appRouter } from "../routers.js";
import { createContext } from "./context.js";
import { serveStatic } from "./static.js";
import { registerSmsWebhookRoutes } from "../webhooks.js";
import { registerAffiliateRoutes } from "../affiliateRoutes.js";
import { createRateLimitMiddleware, requireSameOriginForMutations, securityHeadersMiddleware } from "../security.js";
import { requiredProductionEnvironmentErrors, requestObservabilityMiddleware, writeOperationalEvent } from "../observability.js";
import { ENV } from "./env.js";
import { parseConfiguredPort } from "./port.js";
import { isStaticOnlyPreview } from "./previewMode.js";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

const staticOnlyPreview = isStaticOnlyPreview({
  vercel: process.env.VERCEL,
  vercelEnv: process.env.VERCEL_ENV,
  databaseUrl: ENV.databaseUrl,
});

export async function createApp() {
  const environmentErrors = requiredProductionEnvironmentErrors({
    ...ENV,
    isProduction: ENV.isProduction && !staticOnlyPreview,
  });
  if (environmentErrors.length) throw new Error(`NSOS production startup configuration is invalid: ${environmentErrors.join(" ")}`);
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(requestObservabilityMiddleware());
  app.use(securityHeadersMiddleware(process.env.NODE_ENV === "production"));
  app.get("/healthz", (_request, response) => {
    response.set("Cache-Control", "no-store").status(200).json({
      status: "ok",
      mode: staticOnlyPreview ? "static-only-preview" : "full",
    });
  });
  if (staticOnlyPreview) {
    const previewApiDisabled = (_request: express.Request, response: express.Response) => {
      response.status(503).json({ error: "Preview API is disabled until an isolated preview database is configured." });
    };
    app.use("/api", previewApiDisabled);
    app.use(["/storage", "/manus-storage", "/r"], previewApiDisabled);
  }
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
    const { setupVite } = await import("./vite.js");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  return { app, server };
}

async function startServer() {
  const { app, server } = await createApp();
  const preferredPort = parseConfiguredPort(process.env.PORT);
  const port = ENV.isProduction ? preferredPort : await findAvailablePort(preferredPort);

  if (!ENV.isProduction && port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.on("error", error => {
    writeOperationalEvent("error", "server_listen_failed", {
      port,
      code: "code" in error && typeof error.code === "string" ? error.code : "UNKNOWN",
    });
    process.exitCode = 1;
  });

  server.listen(port, () => {
    writeOperationalEvent("info", "server_started", { port, production: ENV.isProduction });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch(error => {
    console.error("NSOS startup failed", error);
    process.exitCode = 1;
  });
}
