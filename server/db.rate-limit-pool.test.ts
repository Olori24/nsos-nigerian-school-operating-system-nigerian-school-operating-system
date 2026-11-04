import { describe, expect, it, vi } from "vitest";
import {
  RATE_LIMIT_DB_CONNECT_TIMEOUT_MS,
  RATE_LIMIT_DB_QUERY_TIMEOUT_MS,
  rateLimitDatabasePoolOptions,
} from "./db/core";
import { withRateLimitConnection, type RateLimitQuery } from "./db.rate-limit-connection";

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

describe("rate-limit connection lifecycle", () => {
  function connection(query: RateLimitQuery) {
    return { query: vi.fn(query), destroy: vi.fn(), release: vi.fn() };
  }

  for (const statement of ["INSERT", "SELECT", "DELETE cleanup"]) {
    it(`destroys the connection and never releases it when ${statement} times out`, async () => {
      const timeout = Object.assign(new Error("query timed out"), { code: "PROTOCOL_SEQUENCE_TIMEOUT" });
      const conn = connection(vi.fn().mockRejectedValue(timeout));

      await expect(withRateLimitConnection(conn, async query => {
        await query({ sql: statement }, []);
      })).rejects.toBe(timeout);

      expect(conn.destroy).toHaveBeenCalledTimes(1);
      expect(conn.release).not.toHaveBeenCalled();
    });
  }

  it("releases the connection after successful queries", async () => {
    const conn = connection(vi.fn().mockResolvedValue([[], []]));

    await expect(withRateLimitConnection(conn, async query => query({ sql: "SELECT 1" }))).resolves.toEqual([[], []]);

    expect(conn.destroy).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it("releases the connection after non-timeout query errors", async () => {
    const error = Object.assign(new Error("database unavailable"), { code: "ECONNRESET" });
    const conn = connection(vi.fn().mockRejectedValue(error));

    await expect(withRateLimitConnection(conn, async query => query({ sql: "SELECT 1" }))).rejects.toBe(error);

    expect(conn.destroy).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it("destroys only once if a timed-out query is caught by opportunistic cleanup", async () => {
    const timeout = Object.assign(new Error("query timed out"), { code: "PROTOCOL_SEQUENCE_TIMEOUT" });
    const conn = connection(vi.fn().mockRejectedValue(timeout));

    await expect(withRateLimitConnection(conn, async query => {
      try {
        await query({ sql: "DELETE cleanup" });
      } catch {
        return "counted";
      }
      return "counted";
    })).resolves.toBe("counted");

    expect(conn.destroy).toHaveBeenCalledTimes(1);
    expect(conn.release).not.toHaveBeenCalled();
  });
});
