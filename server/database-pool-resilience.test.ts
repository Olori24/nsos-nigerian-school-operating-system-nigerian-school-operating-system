import { describe, expect, it } from "vitest";
import { DB_POOL_CONNECTION_LIMIT, DB_POOL_QUEUE_LIMIT, databasePoolOptions } from "./db";

describe("database pool resilience", () => {
  it("keeps each autoscaled application instance within a bounded, keepalive-enabled database pool", () => {
    expect(databasePoolOptions("mysql://user:password@database.example/nsos")).toEqual(expect.objectContaining({
      uri: "mysql://user:password@database.example/nsos",
      connectionLimit: DB_POOL_CONNECTION_LIMIT,
      maxIdle: DB_POOL_CONNECTION_LIMIT,
      queueLimit: DB_POOL_QUEUE_LIMIT,
      waitForConnections: true,
      enableKeepAlive: true,
    }));
    expect(DB_POOL_CONNECTION_LIMIT).toBeLessThanOrEqual(5);
    expect(DB_POOL_QUEUE_LIMIT).toBeGreaterThan(0);
  });
});
