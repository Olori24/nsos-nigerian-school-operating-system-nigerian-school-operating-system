import { beforeEach, describe, expect, it, vi } from "vitest";

const poolMocks = vi.hoisted(() => ({ createPool: vi.fn() }));

vi.mock("mysql2", () => ({ createPool: poolMocks.createPool }));

import {
  consumeSharedRateLimit,
  RATE_LIMIT_DB_CONNECT_TIMEOUT_MS,
  RATE_LIMIT_DB_QUERY_TIMEOUT_MS,
  edtefRateLimitDatabasePoolOptions,
  rateLimitDatabasePoolOptions,
} from "./db/core";
import { withRateLimitConnection, type RateLimitQuery } from "./db.rate-limit-connection";

describe("rate-limit database pool isolation", () => {
  it("preserves bounded concurrency for existing application rate limits", () => {
    const options = rateLimitDatabasePoolOptions("mysql://user:password@example.test/nsos");
    expect(options.connectionLimit).toBe(5);
    expect(options.maxIdle).toBe(5);
    expect(options.waitForConnections).toBe(true);
    expect(options.queueLimit).toBe(20);
    expect(options.connectTimeout).toBe(RATE_LIMIT_DB_CONNECT_TIMEOUT_MS);
  });

  it("isolates EDTEF quota traffic in a separate fail-fast pool", () => {
    const options = edtefRateLimitDatabasePoolOptions("mysql://user:password@example.test/nsos");
    expect(options.connectionLimit).toBe(3);
    expect(options.maxIdle).toBe(3);
    expect(options.waitForConnections).toBe(false);
    expect(options.queueLimit).toBe(0);
    expect(options.connectTimeout).toBe(RATE_LIMIT_DB_CONNECT_TIMEOUT_MS);
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

  it("releases after a swallowed non-timeout cleanup error", async () => {
    const error = Object.assign(new Error("cleanup unavailable"), { code: "ECONNRESET" });
    const conn = connection(vi.fn().mockRejectedValue(error));

    await expect(withRateLimitConnection(conn, async query => {
      try {
        await query({ sql: "DELETE cleanup" });
      } catch {
        return "counted";
      }
      return "counted";
    })).resolves.toBe("counted");

    expect(conn.destroy).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it("releases after an operation error outside the query wrapper", async () => {
    const conn = connection(vi.fn().mockResolvedValue([[], []]));
    const error = new Error("post-query processing failed");

    await expect(withRateLimitConnection(conn, async () => {
      throw error;
    })).rejects.toBe(error);

    expect(conn.destroy).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it("does not release or destroy more than once after repeated timeout handling", async () => {
    const timeout = Object.assign(new Error("query timed out"), { code: "PROTOCOL_SEQUENCE_TIMEOUT" });
    const conn = connection(vi.fn().mockRejectedValue(timeout));

    await expect(withRateLimitConnection(conn, async query => {
      for (let index = 0; index < 2; index += 1) {
        try {
          await query({ sql: "DELETE cleanup" });
        } catch {
          // The cleanup caller may swallow this, but the connection stays destroyed.
        }
      }
      return "counted";
    })).resolves.toBe("counted");

    expect(conn.destroy).toHaveBeenCalledTimes(1);
    expect(conn.release).not.toHaveBeenCalled();
  });
});

describe("shared rate-limit namespace routing", () => {
  beforeEach(() => {
    poolMocks.createPool.mockReset();
  });

  it("uses the isolated EDTEF pool only for EDTEF upstream quota requests", async () => {
    const getConnectionByLimit = new Map<number, ReturnType<typeof connection>>();
    poolMocks.createPool.mockImplementation((options: unknown) => {
      const connectionLimit = (options as { connectionLimit: number }).connectionLimit;
      const conn = connection(vi.fn(async ({ sql }: { sql: string }) => {
        if (sql.startsWith("SELECT")) return [[{ count: 1 }], []] as never;
        return [{ affectedRows: 1 }, []] as never;
      }));
      getConnectionByLimit.set(connectionLimit, conn);
      return {
        promise: () => ({ getConnection: vi.fn().mockResolvedValue(conn) }),
      } as never;
    });

    const common = {
      route: "/api/health",
      clientKey: "test-client",
      limit: 10,
      windowMs: 60_000,
      now: 1_800_000_000_000,
    };

    await consumeSharedRateLimit({ ...common, namespace: "edtef-upstream" });
    await consumeSharedRateLimit({ ...common, namespace: "application-api" });

    expect(poolMocks.createPool).toHaveBeenCalledTimes(2);
    expect(poolMocks.createPool.mock.calls.map(([options]) => (options as { connectionLimit: number }).connectionLimit)).toEqual([3, 5]);
    expect(getConnectionByLimit.get(3)?.query).toHaveBeenCalledTimes(2);
    expect(getConnectionByLimit.get(5)?.query).toHaveBeenCalledTimes(2);
    expect(getConnectionByLimit.get(3)?.release).toHaveBeenCalledTimes(1);
    expect(getConnectionByLimit.get(5)?.release).toHaveBeenCalledTimes(1);
  });
});
