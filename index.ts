import express from "express";
import { createApp } from "./server/_core/app";

// Export an Express handler for Vercel. Keep initialization lazy and log the
// original startup exception so failed cold starts are diagnosable in Runtime Logs.
const app = express();
const appPromise = createApp().then(({ app: configuredApp }) => configuredApp);

app.use((request, response, next) => {
  appPromise
    .then(configuredApp => configuredApp(request, response, next))
    .catch(error => {
      console.error("NSOS serverless application initialization failed", error);
      next(error);
    });
});

export default app;
