import posthog, { isPostHogConfigured } from "./posthog";

type LogAttributes = Record<string, string | number | boolean | undefined>;

export const posthogLog = {
  info(message: string, attributes: LogAttributes = {}) {
    if (isPostHogConfigured) posthog.logger.info(message, attributes);
  },
  warn(message: string, attributes: LogAttributes = {}) {
    if (isPostHogConfigured) posthog.logger.warn(message, attributes);
  },
  error(message: string, attributes: LogAttributes = {}) {
    if (isPostHogConfigured) posthog.logger.error(message, attributes);
  },
};
