import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

export type NotificationPayload = { title: string; content: string };
const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

function validatePayload(input: NotificationPayload): NotificationPayload {
  const title = input.title?.trim();
  const content = input.content?.trim();
  if (!title || !content) throw new TRPCError({ code: "BAD_REQUEST", message: "Notification title and content are required." });
  if (title.length > TITLE_MAX_LENGTH || content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Notification exceeds the allowed length." });
  }
  return { title, content };
}

/** Sends owner alerts through the existing Resend transactional-email account. */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const message = validatePayload(payload);
  if (!ENV.resendApiKey || !ENV.authEmailFrom || !ENV.ownerNotificationEmail) {
    console.warn("[Notification] Owner email is not configured; notification was not sent.");
    return false;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${ENV.resendApiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: ENV.authEmailFrom,
        to: [ENV.ownerNotificationEmail],
        subject: `[NSOS] ${message.title.slice(0, 180)}`,
        text: message.content,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      console.warn("[Notification] Resend rejected owner notification.", { status: response.status });
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Owner email delivery failed.", error instanceof Error ? error.message : "Unknown error");
    return false;
  }
}
