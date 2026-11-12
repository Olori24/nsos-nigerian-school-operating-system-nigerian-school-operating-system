import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title must be at most " + TITLE_MAX_LENGTH + " characters.",
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content must be at most " + CONTENT_MAX_LENGTH + " characters.",
    });
  }

  return { title, content };
};

/**
 * Sends owner notifications through NSOS's independent Resend integration.
 * Missing optional notification configuration or provider failures return false.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);
  const apiKey = ENV.resendApiKey.trim();
  const from = ENV.authEmailFrom.trim();
  const to = ENV.ownerNotificationEmail.trim();

  if (!apiKey || !from || !to) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: "Bearer " + apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: title,
        text: content,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      console.warn("[Notification] Owner email delivery failed with status " + response.status + ".");
      return false;
    }
    return true;
  } catch {
    console.warn("[Notification] Owner email delivery request failed.");
    return false;
  }
}
