import { describe, expect, it } from "vitest";
import {
  RATE_LIMIT_DB_CONNECT_TIMEOUT_MS,
  RATE_LIMIT_DB_QUERY_TIMEOUT_MS,
  rateLimitDatabasePoolOptions,
} from "./db/core";

describe("shared rate-limit database pool", () => {
  it("fails fast under pool saturation and bounds connection establishment", () => {
    const options = rateLimitDatabasePoolOptions("mysql://user:password@example.test/nsos");
    expect(options.connectionLimit).toBe(1);
    expect(options.maxIdle).toBe(1);
    expect(options.waitForConnections).toBe(false);
    expect(options.queueLimit).toBe(0);
    expect(options.connectTimeout).toBe(RATE_LIMIT_DB_CONNECT_TIMEOUT_MS);
    expect(options.connectTimeout).toBe(3_000);
  });

  it("uses a bounded per-query timeout", () => {
    expect(RATE_LIMIT_DB_QUERY_TIMEOUT_MS).toBe(3_000);
  });
});
