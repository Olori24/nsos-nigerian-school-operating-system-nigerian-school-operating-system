import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const serverSource = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");

describe("NSOS liveness route", () => {
  it("registers an unauthenticated no-store health response before protected API routes", () => {
    expect(serverSource).toContain('app.get("/healthz"');
    expect(serverSource).toContain('response.set("Cache-Control", "no-store")');
    expect(serverSource).toContain("response.status(200).json(livenessResponse())");
    expect(serverSource.indexOf('app.get("/healthz"')).toBeLessThan(serverSource.indexOf('app.use("/api"'));
  });
});
