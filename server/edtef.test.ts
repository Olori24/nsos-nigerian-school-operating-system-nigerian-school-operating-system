import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearEdtefCacheForTests, requestEdtefJson } from "./edtef";

describe("EDTEF directory service", () => {
  const originalKey = process.env.EDTEF_API_KEY;
  beforeEach(() => {
    clearEdtefCacheForTests();
    process.env.EDTEF_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    clearEdtefCacheForTests();
    if (originalKey === undefined) delete process.env.EDTEF_API_KEY;
    else process.env.EDTEF_API_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it("sends the API key only in the server-side header and caches successful responses", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "school-1" }] }), { status: 200 }));
    await expect(requestEdtefJson("directory/v1/schools")).resolves.toEqual({ data: [{ id: "school-1" }] });
    await expect(requestEdtefJson("directory/v1/schools")).resolves.toEqual({ data: [{ id: "school-1" }] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get("x-api-key")).toBe("test-key");
    expect(fetchMock.mock.calls[0]?.[0]).not.toContain("test-key");
  });

  it("fails closed when the API key is absent", async () => {
    delete process.env.EDTEF_API_KEY;
    await expect(requestEdtefJson("directory/v1/states")).rejects.toMatchObject({ status: 503 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects paths outside the allowlisted EDTEF directory resources", async () => {
    await expect(requestEdtefJson("directory/v1/schools.csv")).rejects.toMatchObject({ status: 400 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps upstream rate limiting to a safe retry response", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 429, headers: { "retry-after": "30" } }));
    await expect(requestEdtefJson("directory/v1/states")).rejects.toMatchObject({ status: 429, retryAfter: "30" });
  });

  it("does not expose upstream response details on failure", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("secret provider diagnostic", { status: 500 }));
    await expect(requestEdtefJson("directory/v1/states")).rejects.toMatchObject({ status: 502, message: "EDTEF directory request failed." });
  });
});
