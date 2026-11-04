import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createApplication } from "./app";

describe("createApplication", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (!server?.listening) return;
    await new Promise<void>((resolve, reject) => {
      server?.close(error => (error ? reject(error) : resolve()));
    });
  });

  it("keeps the health endpoint available without opening a listener during app creation", async () => {
    const app = createApplication();
    expect(app).toBeDefined();

    const testServer = createServer(app);
    server = testServer;
    await new Promise<void>((resolve, reject) => {
      testServer.once("error", reject);
      testServer.listen(0, "127.0.0.1", resolve);
    });

    const address = testServer.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind a TCP port.");

    const response = await fetch(`http://127.0.0.1:${address.port}/healthz`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });
});
