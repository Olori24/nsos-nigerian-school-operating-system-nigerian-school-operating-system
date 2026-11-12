import express from "express";

// Keep application imports inside the request path. A static import can crash
// the Vercel function before its handler is registered, hiding the root error.
const app = express();
let appPromise: Promise<express.Express> | undefined;

app.use(async (request, response, next) => {
  try {
    appPromise ??= import("./server/_core/app").then(async ({ createApp }) => {
      const { app: configuredApp } = await createApp();
      return configuredApp;
    });
    const configuredApp = await appPromise;
    configuredApp(request, response, next);
  } catch (error) {
    console.error("NSOS serverless application initialization failed", error);
    next(error);
  }
});

export default app;
