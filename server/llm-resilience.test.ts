import { afterEach, describe, expect, it, vi } from "vitest";
import { invokeLLM, LLM_REQUEST_TIMEOUT_MS } from "./_core/llm";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("LLM request resilience", () => {
  it("attaches a fresh bounded abort signal to an AI-provider request", async () => {
    const providerFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", providerFetch);

    await invokeLLM({ messages: [{ role: "user", content: "health check" }] });

    expect(LLM_REQUEST_TIMEOUT_MS).toBe(30_000);
    expect(providerFetch).toHaveBeenCalledTimes(1);
    const init = providerFetch.mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal?.aborted).toBe(false);
  });
});
