import type { Request, Response } from "express";
import { createApp } from "./server/_core/index";

// Reuse one configured Express application for this serverless instance.
let appPromise: ReturnType<typeof createApp> | undefined;

export default async function handler(request: Request, response: Response) {
  appPromise ??= createApp();
  const { app } = await appPromise;
  return app(request, response);
}
