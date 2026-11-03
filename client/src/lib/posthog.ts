import posthog from "posthog-js";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST;
export const isPostHogConfigured = Boolean(posthogKey && posthogHost);

if (!isPostHogConfigured) {
  if (import.meta.env.DEV) {
    const missingVariable = posthogKey ? "VITE_POSTHOG_HOST" : "VITE_POSTHOG_KEY";
    console.warn(
      `${missingVariable} is not configured; PostHog capture is disabled until both VITE_POSTHOG_KEY and VITE_POSTHOG_HOST are set.`,
    );
  }
} else {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    defaults: "2026-08-30",
    logs: {
      serviceName: "nsos-web",
      environment: import.meta.env.MODE,
    },
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  });
}

export default posthog;
