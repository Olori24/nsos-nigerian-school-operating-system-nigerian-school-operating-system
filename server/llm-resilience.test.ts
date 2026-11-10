import { afterEach, describe, expect, it, vi } from "vitest";
import { invokeLLM, LLM_REQUEST_TIMEOUT_MS } from "./_core/llm";
import { ENV } from "./_core/env";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  ENV.llmProvider = "forge";
  ENV.llmApiBaseUrl = "";
  ENV.llmApiKey = "";
  ENV.llmModel = "";
});

describe("LLM request resilience", () => {
  it("attaches a fresh bounded abort signal to an AI-provider request", async () => {
    const providerFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", providerFetch);
    ENV.forgeApiKey = "nsos-vitest-forge-api-key";

    await invokeLLM({ messages: [{ role: "user", content: "health check" }] });

    expect(LLM_REQUEST_TIMEOUT_MS).toBe(30_000);
    expect(providerFetch).toHaveBeenCalledTimes(1);
    const init = providerFetch.mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal?.aborted).toBe(false);
  });
  it("uses an independently configured OpenAI-compatible endpoint and default model", async () => {
    const providerFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", providerFetch);
    ENV.llmProvider = "openai-compatible";
    ENV.llmApiBaseUrl = "https://generativelanguage.googleapis.com/v1beta/openai/";
    ENV.llmApiKey = "standalone-test-key";
    ENV.llmModel = "gemini-test-model";

    await invokeLLM({ messages: [{ role: "user", content: "health check" }] });

    expect(providerFetch).toHaveBeenCalledTimes(1);
    expect(providerFetch.mock.calls[0]?.[0]).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    const init = providerFetch.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer standalone-test-key");
    expect(JSON.parse(String(init.body)).model).toBe("gemini-test-model");
  });
});
