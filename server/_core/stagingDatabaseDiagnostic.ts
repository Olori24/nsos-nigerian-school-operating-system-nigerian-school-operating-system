import { createConnection } from "mysql2/promise";
import type { Express, Request, Response } from "express";

let lastDiagnosticAt = 0;

export function registerStagingDatabaseDiagnostic(app: Express) {
  app.get("/healthz/db", async (_req: Request, res: Response) => {
    res.set("Cache-Control", "no-store");
    if (process.env.VERCEL_ENV !== "preview") {
      return res.status(404).json({ status: "unavailable" });
    }
    const now = Date.now();
    if (now - lastDiagnosticAt < 10_000) {
      return res.status(429).json({ status: "rate_limited" });
    }
    lastDiagnosticAt = now;
    let connection: Awaited<ReturnType<typeof createConnection>> | undefined;
    try {
      const uri = process.env.DATABASE_URL;
      if (!uri) throw new Error("database_not_configured");
      connection = await createConnection({ uri, ssl: { rejectUnauthorized: true }, connectTimeout: 10000 });
      await connection.query("SELECT 1");
      return res.status(200).json({ status: "ok", database: "reachable", check: "SELECT 1" });
    } catch {
      return res.status(503).json({ status: "error", database: "unreachable" });
    } finally {
      await connection?.end().catch(() => undefined);
    }
  });
}
