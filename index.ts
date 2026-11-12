import express from "express";
import { createApp } from "./server/_core/app";

// Vercel requires a root-level Express export. Resolve the shared app once,
// then forward each serverless request to it without opening a TCP listener.
const app = express();
const appPromise = createApp().then(({ app: configuredApp }) => configuredApp);

app.use((request, response, next) => {
  appPromise
    .then(configuredApp => configuredApp(request, response, next))
    .catch(next);
});

export default app;
