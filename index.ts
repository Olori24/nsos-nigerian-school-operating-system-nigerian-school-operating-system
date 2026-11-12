import { createApp } from "./server/_core/app";

// Vercel imports this Express application as a serverless entrypoint.
// The traditional Node server remains available through server/_core/index.ts.
const { app } = await createApp();

export default app;
