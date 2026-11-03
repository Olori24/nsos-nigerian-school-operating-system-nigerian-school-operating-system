import { logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ENV } from "./env";

type LogAttributes = Record<string, string | number | boolean | undefined>;
type LogLevel = "info" | "warn" | "error";

let logger: ReturnType<typeof logs.getLogger> | undefined;

export function initializePostHogLogs() {
  if (!ENV.posthogKey || !ENV.posthogHost) {
    if (!ENV.isProduction) {
      const variable = ENV.posthogKey ? "VITE_POSTHOG_HOST" : "VITE_POSTHOG_KEY";
      console.error(new Error(`${variable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variable} is configured`));
    }
    return;
  }

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      "service.name": "nsos-server",
      "deployment.environment": process.env.NODE_ENV ?? "development",
    }),
    logRecordProcessors: [
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: `${ENV.posthogHost.replace(/\/$/, "")}/i/v1/logs`,
          headers: { Authorization: `Bearer ${ENV.posthogKey}` },
        }),
      ),
    ],
  });

  sdk.start();
  logger = logs.getLogger("nsos-posthog");
}

export function posthogLog(level: LogLevel, body: string, attributes: LogAttributes = {}) {
  logger?.emit({
    severityText: level.toUpperCase(),
    body,
    attributes,
  });
}
