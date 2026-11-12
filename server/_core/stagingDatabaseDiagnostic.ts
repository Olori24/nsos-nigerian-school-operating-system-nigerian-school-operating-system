import { timingSafeEqual } from "node:crypto";
import { createConnection } from "mysql2/promise";
import type { Express, Request, Response } from "express";

const BRANCH = "fix/vercel-serverless-runtime-init";

export function registerStagingDatabaseDiagnostic(app: Express) {
  app.get("/healthz/db", async (req: Request, res: Response) => {
    res.set("Cache-Control", "no-store");
    const expected = process.env.JWT_SECRET ?? "";
    const supplied = typeof req.query.token === "string" ? req.query.token : "";
    const authorized = expected.length === supplied.length && expected.length >= 32 && timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
    if (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== BRANCH || !authorized) {
      return res.status(404).json({ status: "unavailable" });
    }
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
