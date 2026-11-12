import express from "express";
import { createApp } from "./server/_core/app";

// Vercel executes this handler without opening a listening socket.
// The build bundles all local modules so Node ESM never has to resolve
// extensionless TypeScript source imports at runtime.
const app = express();
let appPromise: ReturnType<typeof createApp> | undefined;

app.use(async (request, response, next) => {
  try {
    appPromise ??= createApp();
    const { app: configuredApp } = await appPromise;
    configuredApp(request, response, next);
  } catch (error) {
    console.error("NSOS serverless application initialization failed", error);
    next(error);
  }
});

export default app;
