import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { serveStatic } from "./server/_core/static.js";

// Keep the Express application warm between invocations. Import the server
// bootstrap lazily so module-initialization failures are caught and logged too.
let appPromise: Promise<{ app: import("express").Express }> | undefined;

const SENSITIVE_ENV_KEYS = [
  "JWT_SECRET",
  "DATABASE_URL",
  "BUILT_IN_FORGE_API_KEY",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
  "COMPOSIO_API_KEY",
  "AWS_SECRET_ACCESS_KEY",
  "S3_SECRET_ACCESS_KEY",
];

function safeErrorText(value: unknown): string {
  let message = value instanceof Error ? `${value.name}: ${value.message}\\n${value.stack ?? ""}` : String(value);
  for (const key of SENSITIVE_ENV_KEYS) {
    const secret = process.env[key];
    if (secret && secret.length >= 4) message = message.split(secret).join("[REDACTED]");
  }
  return message.slice(0, 12_000);
}

export default async function handler(request: Request, response: Response) {
  const requestId = randomUUID();
  response.setHeader("X-Request-ID", requestId);

  try {
    // The development-only Vite dependency graph must never load in production.
    appPromise ??= import("./server/_core/index.js").then(async ({ createApp }) => {
      const { app, server } = await createApp();
      return { app, server };
    });
    const { app } = await appPromise;
    return app(request, response);
  } catch (error) {
    // Never dump environment values, request headers, cookies, bodies or credentials.
    console.error(JSON.stringify({
      service: "nsos",
      event: "vercel_function_invocation_failed",
      requestId,
      method: request.method,
      path: request.path,
      error: safeErrorText(error),
    }));

    appPromise = undefined;
    if (!response.headersSent) {
      return response.status(500).json({
        error: "Application startup failed.",
        requestId,
      });
    }
    return response.end();
  }
}
