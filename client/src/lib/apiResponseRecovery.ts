export const NON_JSON_API_RESPONSE_MESSAGE = "NSOS received an unexpected page instead of a secure data response. No blueprint was created. Reload NSOS and try again.";

export function assertJsonTrpcResponse(response: Response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json")) return response;
  throw new Error(NON_JSON_API_RESPONSE_MESSAGE);
}

export function formatInstitutionBuilderError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/unexpected token|doctype|not valid json|unexpected page instead of a secure data response/i.test(message)) return NON_JSON_API_RESPONSE_MESSAGE;
  return message || "NSOS could not prepare this private blueprint. No institution record was created. Please try again.";
}
