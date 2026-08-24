import { describe, expect, it } from "vitest";
import { assertJsonTrpcResponse, formatInstitutionBuilderError, NON_JSON_API_RESPONSE_MESSAGE } from "../client/src/lib/apiResponseRecovery";

describe("tRPC non-JSON response recovery", () => {
  it("allows typed JSON tRPC responses to continue unchanged", () => {
    const response = new Response(JSON.stringify({ result: { data: {} } }), { headers: { "content-type": "application/json; charset=utf-8" } });
    expect(assertJsonTrpcResponse(response)).toBe(response);
  });

  it("rejects an HTML document before the tRPC parser exposes a raw JSON syntax error", () => {
    const response = new Response("<!DOCTYPE html><html><body>NSOS</body></html>", { headers: { "content-type": "text/html; charset=utf-8" } });
    expect(() => assertJsonTrpcResponse(response)).toThrow(NON_JSON_API_RESPONSE_MESSAGE);
    expect(formatInstitutionBuilderError(new SyntaxError("Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"))).toBe(NON_JSON_API_RESPONSE_MESSAGE);
  });
});
