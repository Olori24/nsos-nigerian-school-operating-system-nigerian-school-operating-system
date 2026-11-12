import { describe, expect, it } from "vitest";
import { DB_POOL_CONNECTION_LIMIT, DB_POOL_QUEUE_LIMIT, databasePoolOptions } from "./db";

describe("database pool resilience", () => {
  it("keeps each autoscaled application instance within a bounded, keepalive-enabled database pool with verified remote TLS", () => {
    expect(databasePoolOptions("mysql://user:password@database.example:4000/nsos")).toEqual(expect.objectContaining({
      host: "database.example",
      port: 4000,
      user: "user",
      password: "password",
      database: "nsos",
      connectionLimit: DB_POOL_CONNECTION_LIMIT,
      maxIdle: DB_POOL_CONNECTION_LIMIT,
      idleTimeout: 60_000,
      waitForConnections: true,
      queueLimit: DB_POOL_QUEUE_LIMIT,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      ssl: { rejectUnauthorized: true },
    }));
    expect(DB_POOL_CONNECTION_LIMIT).toBeLessThanOrEqual(5);
    expect(DB_POOL_QUEUE_LIMIT).toBeGreaterThan(0);
  });
});
