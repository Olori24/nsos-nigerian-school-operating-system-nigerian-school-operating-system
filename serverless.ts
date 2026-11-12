import express from "express";
import { createApp } from "./server/_core/app";

// Initialize the Express app once when the function module loads. Constructing
// rate-limit middleware inside a request handler triggers runtime validation
// errors and recreates the middleware on every request.
const app = express();
const appPromise = createApp().then(({ app: configuredApp }) => configuredApp);

// Mark initialization failures as handled immediately, while retaining the
// rejected promise so each request receives the original startup error.
void appPromise.catch(error => {
  console.error("NSOS serverless application initialization failed", error);
});

app.use((request, response, next) => {
  appPromise
    .then(configuredApp => configuredApp(request, response, next))
    .catch(next);
});

export default app;
