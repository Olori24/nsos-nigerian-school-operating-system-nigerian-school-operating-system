import { ENV } from "./_core/env";

const COMPOSIO_BASE_URL = "https://backend.composio.dev/api/v3.1";

export type ComposioAction = {
  toolSlug: string;
  arguments?: Record<string, unknown>;
  userId?: string;
  connectedAccountId?: string;
  version?: string;
};

export function isComposioConfigured(): boolean {
  return Boolean(ENV.composioApiKey && ENV.composioUserId);
}

export function buildComposioRequest(action: ComposioAction) {
  const userId = action.userId ?? ENV.composioUserId;
  if (!userId) throw new Error("Composio user ID is not configured.");
  if (!action.toolSlug) throw new Error("Composio tool slug is required.");

  const version = action.version ?? ENV.composioToolVersion;
  const body: Record<string, unknown> = {
    user_id: userId,
    arguments: action.arguments ?? {},
  };

  const connectedAccountId =
    action.connectedAccountId ?? ENV.composioConnectedAccountId;
  if (connectedAccountId) body.connected_account_id = connectedAccountId;
  if (version) body.version = version;

  return {
    url:
      COMPOSIO_BASE_URL +
      "/tools/execute/" +
      encodeURIComponent(action.toolSlug),
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ENV.composioApiKey,
    },
    body,
  };
}

export async function executeComposioAction(action: ComposioAction) {
  if (!ENV.composioApiKey) {
    throw new Error("Composio is not configured: COMPOSIO_API_KEY is missing.");
  }

  const request = buildComposioRequest(action);
  const response = await fetch(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(request.body),
    signal: AbortSignal.timeout(15_000),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string; log_id?: string; data?: unknown }
    | null;

  if (!response.ok) {
    const message =
      payload?.error ??
      payload?.message ??
      "Composio action failed with HTTP " + response.status + ".";
    throw new Error(message);
  }

  return payload;
}
