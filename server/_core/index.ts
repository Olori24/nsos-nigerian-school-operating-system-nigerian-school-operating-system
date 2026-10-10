import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
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
import { requiredProductionEnvironmentErrors, requestObservabilityMiddleware, writeOperationalEvent } from "../observability";
import { ENV } from "./env";

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

async function startServer() {
  const environmentErrors = requiredProductionEnvironmentErrors(ENV);
  if (environmentErrors.length) throw new Error(`NSOS production startup configuration is invalid: ${environmentErrors.join(" ")}`);
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(requestObservabilityMiddleware());
  app.use(securityHeadersMiddleware(process.env.NODE_ENV === "production"));
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
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  registerStorageProxy(app);
  registerGoogleAuthRoutes(app);
  registerEmailAuthRoutes(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const rawPort = (process.env.PORT ?? "3000").trim();
  const preferredPort = Number(rawPort);
  if (!/^\\d+$/.test(rawPort) || !Number.isInteger(preferredPort) || preferredPort < 1 || preferredPort > 65535) {
    throw new Error("PORT must be a valid TCP port between 1 and 65535.");
  }

  // Managed production platforms route traffic to the exact PORT they provide.
  // Silently choosing another port makes the process appear healthy while the
  // platform health check and incoming traffic continue targeting the old port.
  // Port fallback is only useful during local development.
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

startServer().catch(console.error);
