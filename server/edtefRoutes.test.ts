import express from "express";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./edtef", () => ({
  EdtefApiError: class EdtefApiError extends Error {
    constructor(message: string, readonly status: number, readonly retryAfter?: string) { super(message); }
  },
  requestEdtefJson: vi.fn(),
}));

import { EdtefApiError, requestEdtefJson } from "./edtef";
import { registerEdtefRoutes } from "./edtefRoutes";

const app = express();
registerEdtefRoutes(app);
let server: ReturnType<typeof app.listen>;
let baseUrl = "";

beforeAll(async () => {
  server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind a TCP port.");
  baseUrl = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});
beforeEach(() => vi.clearAllMocks());

describe("EDTEF directory proxy routes", () => {
  it("returns state data with required attribution", async () => {
    vi.mocked(requestEdtefJson).mockResolvedValue({ data: [{ code: "NG-LA", name: "Lagos" }] });
    const response = await fetch(`${baseUrl}/api/edtef/states`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { data: [{ code: "NG-LA", name: "Lagos" }] },
      attribution: { name: "EDTEF school directory (edtef.org)", url: "https://edtef.org" },
    });
    expect(requestEdtefJson).toHaveBeenCalledWith("directory/v1/states");
  });

  it("forwards only approved, validated school filters", async () => {
    vi.mocked(requestEdtefJson).mockResolvedValue({ data: [] });
    const response = await fetch(`${baseUrl}/api/edtef/schools?state=kwara&ownership=state&page=2&per_page=20`);
    expect(response.status).toBe(200);
    const [path, query] = vi.mocked(requestEdtefJson).mock.calls[0] ?? [];
    expect(path).toBe("directory/v1/schools");
    expect(query?.toString()).toBe("state=kwara&ownership=state&page=2&per_page=20");
  });

  it("rejects invalid filter values before making an upstream request", async () => {
    const response = await fetch(`${baseUrl}/api/edtef/schools?boarding=maybe`);
    expect(response.status).toBe(400);
    expect(requestEdtefJson).not.toHaveBeenCalled();
  });

  it("validates school identifiers before making an upstream request", async () => {
    const response = await fetch(`${baseUrl}/api/edtef/schools/invalid%21id`);
    expect(response.status).toBe(400);
    expect(requestEdtefJson).not.toHaveBeenCalled();
  });

  it("returns a safe service error when EDTEF is rate limited", async () => {
    const error = new EdtefApiError("EDTEF rate limit reached. Please retry shortly.", 429, "30");
    vi.mocked(requestEdtefJson).mockRejectedValue(error);
    const response = await fetch(`${baseUrl}/api/edtef/states`);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
    await expect(response.json()).resolves.toMatchObject({ error: { message: "EDTEF rate limit reached. Please retry shortly." } });
  });
});
