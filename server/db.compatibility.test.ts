import { describe, expect, it } from "vitest";
import { createPool } from "mysql2";
import { databasePoolOptions, DB_POOL_CONNECTION_LIMIT, DB_POOL_QUEUE_LIMIT } from "./db";

const databaseUrl = process.env.DATABASE_URL;
const databaseEnabled = Boolean(databaseUrl);

describe("database pool configuration", () => {
  it("keeps the supported bounded pool, idle timeout, queue, and keep-alive settings", () => {
    const options = databasePoolOptions("mysql://nsos:password@127.0.0.1:3306/nsos");
    expect(options.connectionLimit).toBe(DB_POOL_CONNECTION_LIMIT);
    expect(options.maxIdle).toBe(DB_POOL_CONNECTION_LIMIT);
    expect(options.idleTimeout).toBe(60_000);
    expect(options.waitForConnections).toBe(true);
    expect(options.queueLimit).toBe(DB_POOL_QUEUE_LIMIT);
    expect(options.enableKeepAlive).toBe(true);
    expect(options.keepAliveInitialDelay).toBe(0);
    expect(options).not.toHaveProperty("maxLifetime");
  });

  it("requires verified TLS for remote database endpoints", () => {
    const remote = databasePoolOptions("mysql://nsos:password@db.example.com:4000/nsos");
    const local = databasePoolOptions("mysql://nsos:password@127.0.0.1:3306/nsos");
    expect(remote.ssl).toEqual({ rejectUnauthorized: true });
    expect(local.ssl).toBeUndefined();
  });

  it("rejects non-MySQL URL schemes", () => {
    expect(() => databasePoolOptions("postgres://user:password@localhost/db")).toThrow(/mysql:\/\//i);
  });
});

describe.skipIf(!databaseEnabled)("MySQL/TiDB runtime compatibility invariants", () => {
  it("keeps equality and unique-index behaviour aligned with the database's declared collation", async () => {
    const pool = createPool(databasePoolOptions(databaseUrl!)).promise();
    const connection = await pool.getConnection();
    try {
      await connection.query("CREATE TEMPORARY TABLE nsos_collation_probe (value VARCHAR(64) NOT NULL, UNIQUE KEY uq_value (value))");
      await connection.query("INSERT INTO nsos_collation_probe (value) VALUES ('NSOS-Case-Probe')");
      const [collationRows] = await connection.query("SELECT COLLATION(value) AS collation FROM nsos_collation_probe LIMIT 1");
      const [databaseCollationRows] = await connection.query("SELECT @@collation_database AS collation");
      const columnCollation = String((collationRows as Array<{ collation: string }>)[0].collation);
      const databaseCollation = String((databaseCollationRows as Array<{ collation: string }>)[0].collation);
      const [comparisonRows] = await connection.query("SELECT value = 'nsos-case-probe' AS is_equal FROM nsos_collation_probe LIMIT 1");
      const caseInsensitive = Number((comparisonRows as Array<{ is_equal: number }>)[0].is_equal) === 1;
      let duplicateRejected = false;
      try {
        await connection.query("INSERT INTO nsos_collation_probe (value) VALUES ('nsos-case-probe')");
      } catch (error) {
        const databaseError = error as { code?: string; errno?: number };
        if (databaseError.code !== "ER_DUP_ENTRY" && databaseError.errno !== 1062) throw error;
        duplicateRejected = true;
      }
      expect(duplicateRejected).toBe(caseInsensitive);
      expect(columnCollation.length).toBeGreaterThan(0);
      expect(databaseCollation.length).toBeGreaterThan(0);
      console.info(`Column collation: ${columnCollation}; database default: ${databaseCollation}; case-insensitive equality: ${caseInsensitive}`);
    } finally {
      connection.release();
      await pool.end();
    }
  });

  it("uses generated auto-increment IDs without assuming contiguous values", async () => {
    const pool = createPool(databasePoolOptions(databaseUrl!)).promise();
    const connection = await pool.getConnection();
    try {
      await connection.query("CREATE TEMPORARY TABLE nsos_auto_id_probe (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, label VARCHAR(32) NOT NULL UNIQUE)");
      const inserted: number[] = [];
      for (const label of ["first", "remove-me", "third"]) {
        const [result] = await connection.query("INSERT INTO nsos_auto_id_probe (label) VALUES (?)", [label]);
        inserted.push(Number((result as { insertId: number | bigint }).insertId));
      }
      await connection.query("DELETE FROM nsos_auto_id_probe WHERE label = 'remove-me'");
      const [fourthResult] = await connection.query("INSERT INTO nsos_auto_id_probe (label) VALUES ('fourth')");
      const fourthId = Number((fourthResult as { insertId: number | bigint }).insertId);
      const [rows] = await connection.query("SELECT id, label FROM nsos_auto_id_probe ORDER BY label");
      const records = rows as Array<{ id: number | string | bigint; label: string }>;
      const ids = records.map((record) => String(record.id));
      expect(new Set(ids).size).toBe(records.length);
      expect(records.map((record) => record.label).sort()).toEqual(["first", "fourth", "third"]);
      expect(ids).toContain(String(inserted[0]));
      expect(ids).toContain(String(inserted[2]));
      expect(ids).toContain(String(fourthId));
      expect(inserted.every((id) => Number.isSafeInteger(id) && id > 0)).toBe(true);
    } finally {
      connection.release();
      await pool.end();
    }
  });

  it("reconnects and serves a query after a pooled connection is destroyed", async () => {
    const pool = createPool(databasePoolOptions(databaseUrl!)).promise();
    try {
      const staleConnection = await pool.getConnection();
      const [beforeRows] = await staleConnection.query("SELECT CONNECTION_ID() AS connectionId");
      const beforeId = Number((beforeRows as Array<{ connectionId: number }>)[0].connectionId);
      staleConnection.destroy();
      const [afterRows] = await pool.query("SELECT CONNECTION_ID() AS connectionId, 1 AS healthy");
      const after = (afterRows as Array<{ connectionId: number; healthy: number }>)[0];
      expect(Number(after.healthy)).toBe(1);
      expect(Number(after.connectionId)).not.toBe(beforeId);
    } finally {
      await pool.end();
    }
  });
});
