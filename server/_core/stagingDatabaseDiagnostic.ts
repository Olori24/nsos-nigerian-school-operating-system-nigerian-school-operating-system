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
      const parsed = new URL(uri);
      if (parsed.protocol !== "mysql:") throw new Error("database_url_protocol_invalid");
      connection = await createConnection({
        host: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : 3306,
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: decodeURIComponent(parsed.pathname.replace(/^\\//, "")) || undefined,
        ssl: { rejectUnauthorized: true },
        connectTimeout: 10000,
      });
      await connection.query("SELECT 1");
      return res.status(200).json({ status: "ok", database: "reachable", check: "SELECT 1" });
    } catch (error) {
      const details = error as { code?: unknown; errno?: unknown; sqlState?: unknown; name?: unknown };
      const code = typeof details.code === "string" ? details.code : "UNKNOWN";
      console.error("NSOS staging database diagnostic failed", {
        name: typeof details.name === "string" ? details.name : "Error",
        code,
        errno: typeof details.errno === "number" ? details.errno : undefined,
        sqlState: typeof details.sqlState === "string" ? details.sqlState : undefined,
      });
      return res.status(503).json({ status: "error", database: "unreachable", code });
    } finally {
      await connection?.end().catch(() => undefined);
    }
  });
}
